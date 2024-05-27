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
                    if (
                        response.updatedData.title &&
                        response.updatedId === options.noteId
                    ) {
                        options.onRenamed?.(response.updatedData.title);
                    }
                },
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
        sendBinaryMessage,
    };
};
