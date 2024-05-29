import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";
import { appendToTempFile, createTempFile } from "$backend/file-upload.ts";

import {
    BeginFileMessage,
    BeginFileResponse,
    EndFileMessage,
    EndFileResponse,
    FileFrontendMessage,
    SendFileDataMessage,
    SendFileDataResponse,
} from "./messages.ts";

const handleBeginFile: ListenerFn<BeginFileMessage> = async (
    { message: { size, name, mimeType }, respond },
) => {
    console.log("begin file", {
        size,
        name,
        mimeType,
    });

    const targetId = await createTempFile();

    respond<BeginFileResponse>({
        targetId,
        type: "beginFileResponse",
    });
};

const handleSendFileData: ListenerFn<SendFileDataMessage> = async (
    { message, respond },
) => {
    // Handle the file data
    // TODO: keep checking if over file size

    await appendToTempFile(
        message.targetId,
        new Uint8Array(message.binaryData),
    );

    respond<SendFileDataResponse>({
        type: "sendFileDataResponse",
    });
};

const handleEndFile: ListenerFn<EndFileMessage> = (
    { message: { targetId }, respond },
) => {
    console.log("end of file", targetId);
    // TODO: reject file if under size
    respond<EndFileResponse>({
        type: "endFileResponse",
    });
};

export const frontendMap: RegisterListenerMap<FileFrontendMessage> = {
    beginFile: handleBeginFile,
    endFile: handleEndFile,
    sendFileData: handleSendFileData,
};
