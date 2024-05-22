import { NoteFrontendResponse } from "$workers/websocket/api/notes/messages.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { redirectTo } from "$frontend/redirection-manager.ts";

export interface NoteWebsocketOptions {
    noteId?: number | null;
}

export const useNoteWebsocket = (options: NoteWebsocketOptions) => {
    const { sendMessage } = useWebsocketService<NoteFrontendResponse>({
        eventMap: {
            notes: {
                deleteNoteResponse: (response) => {
                    if (response.deletedId === options.noteId) {
                        redirectTo.root();
                    }
                },
            },
        },
    });

    return {
        sendMessage,
    };
};
