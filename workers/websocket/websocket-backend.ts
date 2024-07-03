import { NotificationBackendMessage } from "$workers/websocket/api/notifications/messages.ts";

export type BackendMessage = NotificationBackendMessage;

export const createBackendMessage = <T extends BackendMessage>(
    namespace: T["namespace"],
    type: T["type"],
    message: Omit<T, "namespace" | "type" | "requestId">,
) => ({
    requestId: crypto.randomUUID(),
    namespace,
    type,
    ...message,
});
