import { NoteFrontendResponse } from "$workers/websocket/api/notes/messages.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { redirectTo } from "$frontend/redirection-manager.ts";
import { UpdateNoteRequest } from "$schemas/notes.ts";
import {
    GetSingleGroupMessage,
    GetSingleGroupResponse,
} from "$workers/websocket/api/groups/messages.ts";

export type UpdatedData =
    & Pick<UpdateNoteRequest, "tags" | "title" | "text" | "is_encrypted">
    & {
        group_id?: number | null;
        group_name?: string | null;
    };

export interface NoteWebsocketOptions {
    noteId?: number | null;
    onNoteUpdated?: (data: Partial<UpdatedData>) => void;
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
                            is_encrypted: response.is_encrypted,
                        });
                    }
                },
                updateNoteResponse: (response) => {
                    if (response.updated_id === options.noteId) {
                        options.onNoteUpdated?.({
                            tags: response.updated_data.tags,
                            title: response.updated_data.title,
                            text: response.updated_data.text,
                            is_encrypted: response.updated_data.is_encrypted,
                        });
                    }

                    if (response.updated_data.group_id !== undefined) {
                        if (response.updated_data.group_id === null) {
                            options.onNoteUpdated?.({
                                group_id: null,
                                group_name: null,
                            });
                            return;
                        }

                        sendMessage<
                            GetSingleGroupMessage,
                            GetSingleGroupResponse
                        >("groups", "getSingleGroup", {
                            data: {
                                id: response.updated_data.group_id,
                            },
                            expect: "getSingleGroupResponse",
                        }).then((response) => {
                            if (response.record) {
                                options.onNoteUpdated?.({
                                    group_id: response.record.id,
                                    group_name: response.record.name,
                                });
                            }
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
