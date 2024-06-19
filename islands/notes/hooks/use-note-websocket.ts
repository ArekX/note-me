import { NoteFrontendResponse } from "$workers/websocket/api/notes/messages.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { redirectTo } from "$frontend/redirection-manager.ts";

export interface NoteWebsocketOptions {
    noteId?: number | null;
    onRenamed?: (newName: string) => void;
}

export const useNoteWebsocket = (options: NoteWebsocketOptions) => {
    const { sendMessage, sendBinaryMessage } = useWebsocketService<
        NoteFrontendResponse
    >({
        eventMap: {
            notes: {
                updateNoteResponse: (response) => {
                    // TODO: Check if group changed and update groupname
                    if (
                        ("title" in response.updated_data) &&
                        response.updated_id === options.noteId
                    ) {
                        options.onRenamed?.(response.updated_data.title ?? "");
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
