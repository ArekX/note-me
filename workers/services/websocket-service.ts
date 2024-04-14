/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

import "$std/dotenv/load.ts";
import { WebSocketService } from "../websocket/websocket-service.ts";
import { notificationsHandler } from "../websocket/handlers/notifications.ts";

const service = new WebSocketService();

service.registerHandler(notificationsHandler);

if (import.meta.main) {
    self.onmessage = async (event: MessageEvent<string>) =>
        await service.handleBackendMessage(JSON.parse(event.data));
    service.start();
}
