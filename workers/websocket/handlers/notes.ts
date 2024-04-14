import { BaseWebSocketHandler } from "$workers/websocket/websocket-handler.ts";
import { SocketClient } from "$workers/websocket/types.ts";
import { Payload } from "$types";

export type NoteFrontendMessage = Payload<"deleteNote", { id: number }>;
export type NoteFrontendResponse = Payload<"note-deleted", { id: number }>;

export type NoteBackendMessage = Payload<"note-deleted", { id: number }>;

class NotesHandler
    extends BaseWebSocketHandler<NoteFrontendMessage, NoteBackendMessage> {
    onFrontendMessage(
        _client: SocketClient,
        _message: NoteFrontendMessage,
    ): void {
    }

    getAllowedBackendMessages(): NoteBackendMessage["type"][] {
        return ["note-deleted"];
    }

    onBackendScopedMessage(_data: NoteBackendMessage): Promise<void> {
        throw new Error("Method not implemented.");
    }
}

export const notesHandler = new NotesHandler();
