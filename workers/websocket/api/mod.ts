import { WebsocketService } from "$workers/websocket/websocket-service.ts";
import { notificationKindMap } from "$workers/websocket/api/notifications/mod.ts";

export const registerApiHandlers = (service: WebsocketService) => {
    const { registerKindMap } = service;

    registerKindMap("notifications", notificationKindMap);
};
