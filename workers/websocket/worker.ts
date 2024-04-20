/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

import "$std/dotenv/load.ts";
import { registerApiHandlers } from "$workers/websocket/api/mod.ts";
import { websocketService } from "./websocket-service.ts";

// TODO: Add api definitions

if (import.meta.main) {
    registerApiHandlers(websocketService);

    websocketService.start(
        Deno.env.get("SERVER_ADDRESS") ?? "127.0.0.1",
        +(Deno.env.get("WEBSOCKET_PORT") ?? 8080),
    );

    self.onmessage = (event: MessageEvent<string>) =>
        websocketService.onBackendRequest(JSON.parse(event.data));
}

self.onerror = (event) => {
    console.error("WebSocket worker error:", event);
};
