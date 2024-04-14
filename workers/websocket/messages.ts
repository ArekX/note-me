import {
    NotificationBackendMessage,
    NotificationFrontendMessage,
} from "$workers/websocket/handlers/notifications.ts";
import {
    NoteBackendMessage,
    NoteFrontendMessage,
} from "$workers/websocket/handlers/notes.ts";

export type SocketFrontendMessage =
    | NotificationFrontendMessage
    | NoteFrontendMessage;

export type SocketBackendMessage =
    | NotificationBackendMessage
    | NoteBackendMessage;
