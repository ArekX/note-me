import {
    BeginFileMessage,
    BeginFileResponse,
    EndFileMessage,
    EndFileResponse,
    SendFileDataMessage,
    SendFileDataResponse,
} from "$workers/websocket/api/file/messages.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import Dialog from "$islands/Dialog.tsx";
import { useSignal } from "@preact/signals";

interface FileUploadProps {
    onFileUploadDone?: () => void;
}

const getPercentage = (uploaded: number, total: number) =>
    total != 0 ? Math.floor((uploaded / total) * 100).toFixed(2) : 0;

export default function FileUpload({
    onFileUploadDone,
}: FileUploadProps) {
    const { sendBinaryMessage, sendMessage } = useWebsocketService();

    const isUploading = useSignal(false);
    const fileToUploadCount = useSignal(0);
    const toUploadCount = useSignal(0);
    const uploadedCount = useSignal(0);

    const transferFile = async (file: File) => {
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
            uploadedCount.value += chunk.byteLength;
        }

        // TODO: Handle when file is over limit
        await sendMessage<EndFileMessage, EndFileResponse>(
            "files",
            "endFile",
            {
                data: { targetId },
                expect: "endFileResponse",
            },
        );
        fileToUploadCount.value--;
    };

    const handleFileChange = async (event: Event) => {
        const target = event.target as HTMLInputElement;

        if (target.files === null) {
            return;
        }

        let anyFileUploaded = false;

        const files = Array.from(target.files);
        toUploadCount.value = files.reduce((a, f) => a + f.size, 0);
        uploadedCount.value = 0;
        fileToUploadCount.value = files.length;
        isUploading.value = true;

        for (const file of files) {
            await transferFile(file);
            uploadedCount.value++;
            anyFileUploaded = true;
        }

        target.value = "";

        if (anyFileUploaded) {
            onFileUploadDone?.();
        }

        isUploading.value = false;
    };
    return (
        <>
            <Button addClass="relative" size="sm" title="Upload files...">
                <input
                    class="absolute left-0 right-0 top-0 bottom-0 opacity-0 cursor-pointer"
                    type="file"
                    title="Upload files..."
                    multiple
                    onChange={handleFileChange}
                />
                <Icon name="cloud-upload" />
            </Button>
            {isUploading.value && (
                <Dialog>
                    <p class="text-center">
                        Uploading progress {getPercentage(
                            uploadedCount.value,
                            toUploadCount.value,
                        )}%
                    </p>
                    <progress
                        class="w-full"
                        max={toUploadCount.value}
                        min="0"
                        value={uploadedCount.value}
                    />
                </Dialog>
            )}
        </>
    );
}
