import {
    BeginFileMessage,
    BeginFileResponse,
    EndFileMessage,
    EndFileResponse,
    SendFileDataMessage,
    SendFileDataResponse,
} from "$workers/websocket/api/file/messages.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";

interface FileUploadProps {
    onFileUploadDone?: () => void;
}

export default function FileUpload({
    onFileUploadDone,
}: FileUploadProps) {
    const { sendBinaryMessage, sendMessage } = useWebsocketService();

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
        }

        await sendMessage<EndFileMessage, EndFileResponse>(
            "files",
            "endFile",
            {
                data: { targetId },
                expect: "endFileResponse",
            },
        );
    };

    const handleFileChange = async (event: Event) => {
        const target = event.target as HTMLInputElement;

        if (target.files === null) {
            return;
        }

        let anyFileUploaded = false;

        for (const file of Array.from(target.files)) {
            await transferFile(file);
            anyFileUploaded = true;
        }

        target.value = "";

        if (anyFileUploaded) {
            onFileUploadDone?.();
        }
    };
    return (
        <div>
            <input type="file" multiple onChange={handleFileChange} />
        </div>
    );
}
