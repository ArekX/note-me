import { BackgroundService } from "$workers/background-service.ts";
import { SocketBackendMessage } from "$workers/websocket/messages.ts";

export const services = {
    websocket: new BackgroundService<SocketBackendMessage>("websocket"),
    timer: new BackgroundService<never>("timer"),
};
