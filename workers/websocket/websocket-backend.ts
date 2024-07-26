import { NotificationBackendMessage } from "$workers/websocket/api/notifications/messages.ts";
import { NoteBackendMessage } from "$workers/websocket/api/notes/messages.ts";

export type BackendMessage = NotificationBackendMessage | NoteBackendMessage;

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
