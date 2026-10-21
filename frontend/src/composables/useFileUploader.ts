import { computed, ref } from "vue";
import { useWebsocketService } from "./useWebsocketService";
import { socketErrorMessage } from "@/lib/error-messages";
import { useToastStore } from "@/stores/toast";
import type {
    BeginFileMessage,
    BeginFileResponse,
    EndFileMessage,
    EndFileResponse,
    SendFileDataMessage,
    SendFileDataResponse,
} from "@/types/messages";

export const UPLOAD_CHUNK_SIZE = 32 * 1024;

export interface UploadedFile {
    file: File;
    identifier: string;
}

export type FileUploadStatus =
    "waiting" | "uploading" | "done" | "failed" | "cancelled";

export interface FileUploadState {
    status: FileUploadStatus;
    uploaded: number;
    error: string | null;
}

// beginFile, then one binary
// sendFileData per 32 KB chunk (each waits for its answer), then endFile.
export const useFileUploader = () => {
    const { sendMessage, sendBinaryMessage } = useWebsocketService();
    const toastStore = useToastStore();

    const pending = ref<File[]>([]);
    const totalSize = ref(0);
    const uploadedSize = ref(0);
    const fileStates = ref(new Map<File, FileUploadState>());

    const stateOf = (file: File) => fileStates.value.get(file);

    const isUploading = computed(() => pending.value.length > 0);
    const donePercentage = computed(() =>
        totalSize.value === 0
            ? "0"
            : ((uploadedSize.value / totalSize.value) * 100).toFixed(2),
    );

    const fail = (file: File, error: unknown) => {
        const state = stateOf(file);
        if (state) {
            state.status = "failed";
            state.error = socketErrorMessage(error);
        }
        toastStore.reportError(error, `Failed to upload file '${file.name}': `);
    };

    const transfer = async (file: File): Promise<string | null> => {
        const state = stateOf(file)!;
        state.status = "uploading";
        let targetId: string;
        try {
            ({ target_id: targetId } = await sendMessage<
                BeginFileMessage,
                BeginFileResponse
            >("files", "beginFile", {
                data: {
                    size: file.size,
                    name: file.name,
                    mime_type: file.type,
                },
                expect: "beginFileResponse",
            }));
        } catch (error) {
            fail(file, error);
            return null;
        }

        try {
            const buffer = new Uint8Array(await file.arrayBuffer());
            for (
                let start = 0;
                start < buffer.byteLength;
                start += UPLOAD_CHUNK_SIZE
            ) {
                if (pending.value.length === 0) {
                    return null;
                }
                const chunk = buffer.slice(start, start + UPLOAD_CHUNK_SIZE);
                await sendBinaryMessage<
                    SendFileDataMessage,
                    SendFileDataResponse
                >("files", "sendFileData", {
                    data: { target_id: targetId, binaryData: chunk },
                    expect: "sendFileDataResponse",
                });
                uploadedSize.value += chunk.byteLength;
                state.uploaded += chunk.byteLength;
            }

            await sendMessage<EndFileMessage, EndFileResponse>(
                "files",
                "endFile",
                {
                    data: { target_id: targetId },
                    expect: "endFileResponse",
                },
            );
        } catch (error) {
            fail(file, error);
            return null;
        }
        state.status = "done";
        return targetId;
    };

    const uploadFiles = async (files: File[]): Promise<UploadedFile[]> => {
        if (pending.value.length === 0) {
            fileStates.value = new Map();
        }
        for (const file of files) {
            fileStates.value.set(file, {
                status: "waiting",
                uploaded: 0,
                error: null,
            });
        }
        pending.value = [...pending.value, ...files];
        totalSize.value += files.reduce((sum, file) => sum + file.size, 0);

        const results: UploadedFile[] = [];
        for (const file of files) {
            const identifier = await transfer(file);
            if (pending.value.length === 0) {
                return results;
            }
            if (identifier) {
                results.push({ file, identifier });
            }
            pending.value = pending.value.filter((f) => f !== file);
        }

        if (pending.value.length === 0) {
            totalSize.value = 0;
            uploadedSize.value = 0;
        }
        return results;
    };

    // Stops before the next chunk; the server's temp file is cleaned up by
    // the cleanup-temp-folder task.
    const cancelUpload = () => {
        for (const state of fileStates.value.values()) {
            if (state.status === "waiting" || state.status === "uploading") {
                state.status = "cancelled";
            }
        }
        pending.value = [];
        totalSize.value = 0;
        uploadedSize.value = 0;
    };

    return {
        isUploading,
        totalSize,
        uploadedSize,
        donePercentage,
        stateOf,
        uploadFiles,
        cancelUpload,
    };
};

export type FileUploader = ReturnType<typeof useFileUploader>;
