import { workerSendMesage } from "$workers/services/worker-bus.ts";
import {
    BackendMessage,
    createBackendMessage,
} from "$workers/websocket/websocket-backend.ts";

export type WebsocketMessageKey = "backendRequest";

export const sendMessageToWebsocket = <T extends BackendMessage>(
    ...params: Parameters<typeof createBackendMessage<T>>
) => {
    workerSendMesage<T, WebsocketMessageKey>(
        "websocket",
        "backendRequest",
        createBackendMessage<T>(...params),
    );
};
