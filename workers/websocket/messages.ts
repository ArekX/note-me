import {
    NotificationBackendMessage,
    NotificationFrontendMessage,
} from "$workers/websocket/handlers/notifications.ts";

export type SocketFrontendMessage = NotificationFrontendMessage;

export type SocketBackendMessage = NotificationBackendMessage;
