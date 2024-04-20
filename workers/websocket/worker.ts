/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

import "$std/dotenv/load.ts";
import { registerApiHandlers } from "$workers/websocket/api/mod.ts";
import { workerLogger } from "$backend/logger.ts";
import { websocketService } from "./websocket-service.ts";

if (import.meta.main) {
    registerApiHandlers(websocketService);

    websocketService.startServer(
        Deno.env.get("SERVER_ADDRESS") ?? "127.0.0.1",
        +(Deno.env.get("WEBSOCKET_PORT") ?? 8080),
    );

    self.onmessage = (event: MessageEvent<string>) =>
        websocketService.handleBackendRequest(JSON.parse(event.data));
}

self.onerror = (event) => {
    workerLogger.error("WebSocket service error: {data}", {
        data: event?.error?.message || JSON.stringify(event),
    });
};
