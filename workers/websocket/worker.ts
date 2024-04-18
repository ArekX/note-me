/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

import "$std/dotenv/load.ts";
import { WebSocketService } from "./websocket-service.ts";
import { notificationsHandler } from "./handlers/notifications.ts";

const service = new WebSocketService(
    +(Deno.env.get("WEBSOCKET_PORT") ?? 8080),
    Deno.env.get("SERVER_ADDRESS") ?? "127.0.0.1",
);

service.registerHandler(notificationsHandler);

if (import.meta.main) {
    self.onmessage = async (event: MessageEvent<string>) =>
        await service.handleBackendMessage(JSON.parse(event.data));
    service.start();
}

self.onerror = (event) => {
    console.error("WebSocket worker error:", event);
};
