import { workerSendMesage } from "$workers/services/worker-bus.ts";
import { createBackendMessage } from "$workers/websocket/websocket-backend.ts";

export const sendMessageToWebsocket = (
    ...params: Parameters<typeof createBackendMessage>
) => {
    workerSendMesage(
        "websocket",
        createBackendMessage(...params),
    );
};
