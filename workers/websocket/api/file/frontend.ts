import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";

import { FileFrontendMessage, SendFileDataMessage } from "./messages.ts";

const handleSendFileData: ListenerFn<SendFileDataMessage> = (
    { message },
) => {
    // Handle the file data
    console.log("got target", message.targetId);
    console.log(new TextDecoder().decode(message.binaryData));
};

export const frontendMap: RegisterListenerMap<FileFrontendMessage> = {
    sendFileData: handleSendFileData,
};
