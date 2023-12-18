/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

import "$std/dotenv/load.ts";
import { WebSocketService } from "../websocket-service.ts";
import {
  NotificationMessages,
  notificationsHandler,
} from "../websocket-handlers/notifications.ts";

export type WebSocketMessage = WebSocketNotificationMessage;

const service = new WebSocketService();

export interface WebSocketNotificationMessage {
  type: "notification";
  data: NotificationMessages;
}
service.registerHandler(notificationsHandler);

if (import.meta.main) {
  self.onmessage = async (event: MessageEvent<string>) =>
    await service.handleWorkerMessage(JSON.parse(event.data));
  service.start();
}
