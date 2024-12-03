import { NotificationBackendMessage } from "$workers/websocket/api/notifications/messages.ts";
import { NoteBackendMessage } from "$workers/websocket/api/notes/messages.ts";
import { UserBackendMessage } from "$workers/websocket/api/users/messages.ts";

export type BackendMessage =
    | NotificationBackendMessage
    | NoteBackendMessage
    | UserBackendMessage;

export const createBackendMessage = <T extends BackendMessage>(
    namespace: T["namespace"],
    type: T["type"],
    message: Omit<T, "namespace" | "type" | "requestId">,
): T => ({
    requestId: crypto.randomUUID(),
    namespace,
    type,
    ...message,
} as T);
