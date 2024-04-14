import { BackgroundWorker } from "./background-worker.ts";
import { SocketBackendMessage } from "$workers/websocket/messages.ts";

export const services = {
    websocket: new BackgroundWorker<SocketBackendMessage>("websocket"),
    timer: new BackgroundWorker<never>("timer"),
};
