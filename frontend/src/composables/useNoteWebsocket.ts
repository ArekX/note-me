import { toValue, type MaybeRefOrGetter } from "vue";
import { useRouter } from "vue-router";
import type { NoteFrontendResponse } from "@/types/messages";
import type { UpdateNoteRequest } from "@/schemas/notes";
import { redirectTo } from "@/lib/redirect";
import { useGroupsStore } from "@/stores/groups";
import { useSocketStore } from "@/stores/socket";
import { useWebsocketService } from "./useWebsocketService";

export type UpdatedNoteData = Pick<
    UpdateNoteRequest,
    "tags" | "title" | "text" | "is_encrypted" | "is_wide"
> & {
    group_id?: number | null;
    group_name?: string | null;
};

// fromElsewhere: the change came from another tab, the assistant or a
// background task, not from a request this tab sent.
export const useNoteWebsocket = (
    noteId: MaybeRefOrGetter<number | null>,
    onNoteUpdated: (data: UpdatedNoteData, fromElsewhere: boolean) => void,
) => {
    const router = useRouter();
    const groupsStore = useGroupsStore();
    const socketStore = useSocketStore();

    const service = useWebsocketService<NoteFrontendResponse>({
        notes: {
            revertNoteToHistoryResponse: (response) => {
                if (response.note_id === toValue(noteId)) {
                    onNoteUpdated(
                        {
                            tags: response.tags,
                            title: response.title,
                            text: response.note,
                            is_encrypted: response.is_encrypted,
                        },
                        !socketStore.isOwnRequest(response.requestId),
                    );
                }
            },
            updateNoteResponse: ({ requestId, updated_id, updated_data }) => {
                if (updated_id !== toValue(noteId)) {
                    return;
                }
                const fromElsewhere = !socketStore.isOwnRequest(requestId);

                onNoteUpdated(
                    {
                        tags: updated_data.tags,
                        title: updated_data.title,
                        text: updated_data.text,
                        is_encrypted: updated_data.is_encrypted,
                        is_wide: updated_data.is_wide,
                    },
                    fromElsewhere,
                );

                if (updated_data.group_id === null) {
                    onNoteUpdated(
                        { group_id: null, group_name: null },
                        fromElsewhere,
                    );
                } else if (updated_data.group_id !== undefined) {
                    void groupsStore
                        .getGroup(updated_data.group_id)
                        .then((record) => {
                            if (record) {
                                onNoteUpdated(
                                    {
                                        group_id: record.id,
                                        group_name: record.name,
                                    },
                                    fromElsewhere,
                                );
                            }
                        });
                }
            },
            deleteNoteResponse: ({ deleted_id }) => {
                if (deleted_id === toValue(noteId)) {
                    void router.push(redirectTo.root());
                }
            },
        },
    });

    return service;
};
