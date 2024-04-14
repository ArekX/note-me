import { BackgroundWorker } from "./background-worker.ts";
import { SocketBackendMessage } from "$workers/websocket/messages.ts";

export const services = {
    websocket: new BackgroundWorker<SocketBackendMessage>(
        "websocket/worker.ts",
    ),
    timer: new BackgroundWorker<never>("timers/worker.ts"),
};
