import { NoteFrontendResponse } from "$workers/websocket/api/notes/messages.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { redirectTo } from "$frontend/redirection-manager.ts";
import { UpdateNoteRequest } from "$schemas/notes.ts";

export type UpdatedData = Pick<UpdateNoteRequest, "tags" | "title" | "text">;

export interface NoteWebsocketOptions {
    noteId?: number | null;
    onNoteUpdated?: (data: UpdatedData) => void;
}

export const useNoteWebsocket = (options: NoteWebsocketOptions) => {
    const { sendMessage, sendBinaryMessage } = useWebsocketService<
        NoteFrontendResponse
    >({
        eventMap: {
            notes: {
                revertNoteToHistoryResponse: (response) => {
                    if (response.note_id === options.noteId) {
                        options.onNoteUpdated?.({
                            tags: response.tags,
                            title: response.title,
                            text: response.note,
                        });
                    }
                },
                updateNoteResponse: (response) => {
                    if (response.updated_id === options.noteId) {
                        options.onNoteUpdated?.({
                            tags: response.updated_data.tags,
                            title: response.updated_data.title,
                            text: response.updated_data.text,
                        });
                    }
                },
                deleteNoteResponse: (response) => {
                    if (response.deleted_id === options.noteId) {
                        redirectTo.root();
                    }
                },
            },
        },
    });

    return {
        sendMessage,
        sendBinaryMessage,
    };
};
