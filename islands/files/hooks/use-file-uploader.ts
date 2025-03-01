import {
    SystemErrorMessage,
    useWebsocketService,
} from "$frontend/hooks/use-websocket-service.ts";
import {
    ReadonlySignal,
    Signal,
    useComputed,
    useSignal,
} from "@preact/signals";
import {
    BeginFileMessage,
    BeginFileResponse,
    EndFileMessage,
    EndFileResponse,
    SendFileDataMessage,
    SendFileDataResponse,
} from "$workers/websocket/api/files/messages.ts";
import { addMessage } from "$frontend/toast-message.ts";

export interface FileUploaderHook {
    isUploading: ReadonlySignal<boolean>;
    totalSizeToUpload: Signal<number>;
    uploadedSize: Signal<number>;
    filesLeft: ReadonlySignal<number>;
    donePercentage: ReadonlySignal<string>;
    uploadFiles: (newFiles: File[]) => Promise<UploadedFile[]>;
    cancelUpload: () => void;
}

export interface UploadedFile {
    file: File;
    identifier: string;
}

const getPercentage = (uploaded: number, total: number) =>
    total != 0 ? ((uploaded / total) * 100).toFixed(2) : "0";

export const useFileUploader = (): FileUploaderHook => {
    const { sendBinaryMessage, sendMessage } = useWebsocketService();

    const filesToUpload = useSignal<File[]>([]);

    const isUploading = useComputed(() => filesToUpload.value.length > 0);
    const totalSizeToUpload = useSignal(0);
    const uploadedSize = useSignal(0);
    const filesLeft = useComputed(() => filesToUpload.value.length);
    const donePercentage = useComputed(() =>
        getPercentage(uploadedSize.value, totalSizeToUpload.value)
    );

    const transferFile = async (file: File): Promise<string | null> => {
        const targetId = await startFileUpload(file);

        if (targetId === null) {
            return null;
        }

        const fileBuffer = await file.arrayBuffer();

        const chunkSize = 32 * 1024;
        const totalChunks = Math.ceil(fileBuffer.byteLength / chunkSize);
        for (let i = 0; i < totalChunks; i++) {
            if (filesToUpload.value.length === 0) {
                return null;
            }

            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, fileBuffer.byteLength);
            const chunk = fileBuffer.slice(start, end);
            await sendBinaryMessage<
                SendFileDataMessage,
                SendFileDataResponse
            >(
                "files",
                "sendFileData",
                {
                    data: {
                        binaryData: chunk as unknown as Uint8Array,
                        target_id: targetId,
                    },
                    expect: "sendFileDataResponse",
                },
            );
            uploadedSize.value += chunk.byteLength;
        }

        await finalizeFile(file.name, targetId);

        return targetId;
    };

    const startFileUpload = async (file: File) => {
        try {
            const { target_id } = await sendMessage<
                BeginFileMessage,
                BeginFileResponse
            >("files", "beginFile", {
                data: {
                    size: file.size,
                    name: file.name,
                    mime_type: file.type,
                },
                expect: "beginFileResponse",
            });
            return target_id;
        } catch (e) {
            const error = e as SystemErrorMessage;

            addMessage({
                type: "error",
                text:
                    `Failed to upload file '${file.name}': ${error.data.message}`,
            });
        }

        return null;
    };

    const finalizeFile = async (name: string, targetId: string) => {
        try {
            await sendMessage<EndFileMessage, EndFileResponse>(
                "files",
                "endFile",
                {
                    data: { target_id: targetId },
                    expect: "endFileResponse",
                },
            );
        } catch (e) {
            const error = e as SystemErrorMessage;
            addMessage({
                type: "error",
                text: `Failed to upload file '${name}': ${error.data.message}`,
            });
        }
    };

    const uploadFiles = async (newFiles: File[]): Promise<UploadedFile[]> => {
        filesToUpload.value = [...filesToUpload.value, ...newFiles];
        totalSizeToUpload.value += newFiles.reduce(
            (acc, file) => acc + file.size,
            0,
        );

        const results: UploadedFile[] = [];

        for (const file of newFiles) {
            const resultTargetId = await transferFile(file);

            if (filesToUpload.value.length === 0) {
                return results;
            }

            if (resultTargetId) {
                results.push({
                    file,
                    identifier: resultTargetId,
                });
            }

            filesToUpload.value = filesToUpload.value.filter(
                (f) => f !== file,
            );
        }

        if (filesToUpload.value.length === 0) {
            uploadedSize.value = 0;
            totalSizeToUpload.value = 0;
        }

        return results;
    };

    const cancelUpload = () => {
        filesToUpload.value = [];
        uploadedSize.value = 0;
        totalSizeToUpload.value = 0;
    };

    return {
        isUploading,
        totalSizeToUpload,
        uploadedSize,
        filesLeft,
        donePercentage,
        uploadFiles,
        cancelUpload,
    };
};
