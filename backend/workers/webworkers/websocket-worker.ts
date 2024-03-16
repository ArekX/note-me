/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

import "$std/dotenv/load.ts";
import { WebSocketService } from "../websocket-service.ts";
import {
    notificationsHandler,
    WorkerNotificationRequests,
} from "../websocket-handlers/notifications.ts";
import { Payload } from "$types";

export type WebSocketMessage = Payload<
    "notification",
    WorkerNotificationRequests
>;

const service = new WebSocketService();

service.registerHandler(notificationsHandler);

if (import.meta.main) {
    self.onmessage = async (event: MessageEvent<string>) =>
        await service.handleWorkerMessage(JSON.parse(event.data));
    service.start();
}
