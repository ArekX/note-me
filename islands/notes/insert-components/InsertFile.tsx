import {
    InsertComponent,
    InsertComponentProps,
} from "$islands/notes/InsertDialog.tsx";
import { useRef } from "preact/hooks";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    BeginFileMessage,
    BeginFileResponse,
    EndFileMessage,
    EndFileResponse,
    SendFileDataMessage,
    SendFileDataResponse,
} from "$workers/websocket/api/file/messages.ts";

const Component = ({}: InsertComponentProps) => {
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

        const file = target.files[0];
        if (file) {
            await transferFile(file);
        }

        target.value = "";
    };
    return (
        <div>
            <input type="file" onChange={handleFileChange} />
        </div>
    );
};

export const InsertFileDef: InsertComponent = {
    name: "File",
    component: Component,
};
