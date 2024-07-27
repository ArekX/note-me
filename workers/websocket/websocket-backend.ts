import { NotificationBackendMessage } from "$workers/websocket/api/notifications/messages.ts";
import { NoteBackendMessage } from "$workers/websocket/api/notes/messages.ts";
import { SettingsBackendMessage } from "$workers/websocket/api/settings/messages.ts";

export type BackendMessage =
    | NotificationBackendMessage
    | NoteBackendMessage
    | SettingsBackendMessage;

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
