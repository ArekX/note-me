/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

import { registerApiHandlers } from "$workers/websocket/api/mod.ts";
import { logger, setLoggerName } from "$backend/logger.ts";
import { websocketService } from "./websocket-service.ts";
import { connectWorkerToBus } from "$workers/services/worker-bus.ts";
import { Message } from "$workers/websocket/types.ts";
import { loadEnvironment } from "$backend/env.ts";

loadEnvironment();
setLoggerName("websocket");

self.onerror = (event) => {
    logger.error("WebSocket service error: {data}", {
        data: event?.error?.message || JSON.stringify(event),
    });
};

if (import.meta.main) {
    registerApiHandlers(websocketService);
    connectWorkerToBus(
        "websocket",
        self,
        (message) => websocketService.handleBackendRequest(message as Message),
    );

    websocketService.startServer(
        Deno.env.get("SERVER_ADDRESS") ?? "127.0.0.1",
        +(Deno.env.get("WEBSOCKET_PORT") ?? 8080),
    );
}
