import { frontendMap } from "$workers/websocket/api/notes/frontend.ts";
import { NoteBackendMessage, NoteFrontendMessage } from "./messages.ts";
import { backendMap } from "$workers/websocket/api/notes/backend.ts";
import { RegisterKindMap } from "$workers/websocket/types.ts";

export const noteKindMap: RegisterKindMap<
    NoteBackendMessage,
    NoteFrontendMessage
> = {
    frontend: frontendMap,
    backend: backendMap,
};
