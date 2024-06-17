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
} from "../../../workers/websocket/api/files/messages.ts";
import { addMessage } from "$frontend/toast-message.ts";

export interface FileUploaderHook {
    isUploading: ReadonlySignal<boolean>;
    totalSizeToUpload: Signal<number>;
    uploadedSize: Signal<number>;
    filesLeft: ReadonlySignal<number>;
    donePercentage: ReadonlySignal<string>;
    uploadFiles: (newFiles: File[]) => Promise<void>;
}

const getPercentage = (uploaded: number, total: number) =>
    total != 0 ? Math.floor((uploaded / total) * 100).toFixed(2) : "0";

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

    const transferFile = async (file: File) => {
        const targetId = await startFileUpload(file);

        if (targetId === null) {
            return;
        }

        const fileBuffer = await file.arrayBuffer();

        const chunkSize = 32 * 1024;
        const totalChunks = Math.ceil(fileBuffer.byteLength / chunkSize);
        for (let i = 0; i < totalChunks; i++) {
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
                        binaryData: chunk,
                        targetId,
                    },
                    expect: "sendFileDataResponse",
                },
            );
            uploadedSize.value += chunk.byteLength;
        }

        await finalizeFile(file.name, targetId);
    };

    const startFileUpload = async (file: File) => {
        try {
            const { targetId } = await sendMessage<
                BeginFileMessage,
                BeginFileResponse
            >("files", "beginFile", {
                data: {
                    size: file.size,
                    name: file.name,
                    mimeType: file.type,
                },
                expect: "beginFileResponse",
            });
            return targetId;
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
                    data: { targetId },
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

    const uploadFiles = async (newFiles: File[]) => {
        filesToUpload.value = [...filesToUpload.value, ...newFiles];
        totalSizeToUpload.value += newFiles.reduce(
            (acc, file) => acc + file.size,
            0,
        );

        for (const file of newFiles) {
            await transferFile(file);
            filesToUpload.value = filesToUpload.value.filter(
                (f) => f !== file,
            );
        }

        if (filesToUpload.value.length === 0) {
            uploadedSize.value = 0;
            totalSizeToUpload.value = 0;
        }
    };

    return {
        isUploading,
        totalSizeToUpload,
        uploadedSize,
        filesLeft,
        donePercentage,
        uploadFiles,
    };
};