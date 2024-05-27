import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";

import {
    BeginFileMessage,
    BeginFileResponse,
    EndFileMessage,
    EndFileResponse,
    FileFrontendMessage,
    SendFileDataMessage,
    SendFileDataResponse,
} from "./messages.ts";

const handleBeginFile: ListenerFn<BeginFileMessage> = (
    { message: { size, name, mimeType }, respond },
) => {
    console.log("begin file", {
        size,
        name,
        mimeType,
    });

    respond<BeginFileResponse>({
        targetId: crypto.randomUUID(),
        type: "beginFileResponse",
    });
};

const handleSendFileData: ListenerFn<SendFileDataMessage> = (
    { message, respond },
) => {
    // Handle the file data
    // TODO: keep checking if over file size
    console.log("got target", message.targetId);
    console.log(" start of chunk #######################################");
    console.log(message.binaryData.byteLength);
    console.log(" end of chunk #######################################");

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
