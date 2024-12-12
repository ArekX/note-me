import {
    BackendMessage,
    createBackendMessage,
} from "$workers/websocket/websocket-backend.ts";
import { Channel } from "$workers/channel/mod.ts";

export type WebsocketMessageKey = "backendRequest";

let connectedChannel: Channel | null = null;

export const connectHostChannelForWebsocket = (channel: Channel) => {
    connectedChannel = channel;
};

export const sendMessageToWebsocket = <T extends BackendMessage>(
    ...params: Parameters<typeof createBackendMessage<T>>
) => {
    connectedChannel!.send({
        from: connectedChannel!.name,
        message: createBackendMessage<T>(...params),
        to: "websocket",
        type: "backendRequest",
    });
};
