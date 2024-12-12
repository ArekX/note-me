import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";

import {
    CreateNoteResponse,
    CreatePublicShareMessage,
    CreatePublicShareResponse,
    DeleteHistoryRecordMessage,
    DeleteHistoryRecordResponse,
    DeleteNoteMessage,
    DeleteNoteResponse,
    FindDeletedNotesMessage,
    FindDeletedNotesResponse,
    FindNoteHistoryMessage,
    FindNoteHistoryResponse,
    FindNoteRemindersMessage,
    FindNoteRemindersResponse,
    FindSharedNotesMessage,
    FindSharedNotesResponse,
    FullyDeleteNoteMessage,
    FullyDeleteNoteResponse,
    GetNoteDetailsResponse,
    GetNoteHistoryDataMessage,
    GetNoteHistoryDataResponse,
    GetNoteReminderDataMessage,
    GetNoteReminderDataResponse,
    GetNoteShareDataMessage,
    GetNoteShareDataResponse,
    GetRecentlyOpenedNotesMessage,
    GetRecentlyOpenedNotesResponse,
    NoteFrontendMessage,
    RemovePublicShareMessage,
    RemovePublicShareResponse,
    RemoveReminderMessage,
    RemoveReminderResponse,
    RestoreDeletedNoteMessage,
    RestoreDeletedNoteResponse,
    RevertNoteToHistoryMessage,
    RevertNoteToHistoryResponse,
    SearchNoteMessage,
    SearchNoteResponse,
    SetReminderMessage,
    SetReminderResponse,
    ShareToUsersMessage,
    ShareToUsersResponse,
    UpdateNoteMessage,
    UpdateNoteResponse,
} from "./messages.ts";
import { CreateNoteMessage } from "$workers/websocket/api/notes/messages.ts";
import { requireValidSchema } from "$schemas/mod.ts";
import {
    addNoteRequestSchema,
    SetReminderRequest,
    setReminderSchema,
} from "$schemas/notes.ts";
import { GetNoteDetailsMessage } from "$workers/websocket/api/notes/messages.ts";
import { runSendNotificationAction } from "$backend/actions/send-notification-action.ts";
import {
    NoteSearchResult,
} from "../../../database/query/note-search-repository.ts";
import { action, repository } from "$workers/database/lib.ts";

const handleCreateNote: ListenerFn<CreateNoteMessage> = async (
    { message: { data }, sourceClient, respond },
) => {
    await requireValidSchema(addNoteRequestSchema, data);

    const record = await action.note.createNote({
        data,
        user_id: sourceClient!.userId,
    });

    respond<CreateNoteResponse>({
        type: "createNoteResponse",
        record,
        group_id: data.group_id,
    });
};

const handleUpdateNote: ListenerFn<UpdateNoteMessage> = async (
    { message: { id, data }, sourceClient, respond },
) => {
    await action.note.updateNote({
        data,
        backend_data: {
            noteId: id,
            userId: sourceClient!.userId,
        },
    });

    respond<UpdateNoteResponse>({
        type: "updateNoteResponse",
        updated_id: id,
        updated_data: data,
    });
};

const handleDeleteNote: ListenerFn<DeleteNoteMessage> = async (
    { message: { id }, sourceClient, respond },
) => {
    if (
        !await repository.note.noteExists({
            note_id: id,
            user_id: sourceClient!.userId,
        })
    ) {
        throw new Error("Note does not exist.");
    }

    await repository.noteReminder.removeReminder({
        note_id: id,
        user_id: sourceClient!.userId,
    });
    await repository.note.deleteNote({
        note_id: id,
        user_id: sourceClient!.userId,
    });

    respond<DeleteNoteResponse>({
        type: "deleteNoteResponse",
        deleted_id: id,
    });
};

const handleGetNoteDetails: ListenerFn<GetNoteDetailsMessage> = async (
    { message: { id, options }, sourceClient, respond },
) => {
    const record = await repository.note.getNoteDetails({
        note_id: id,
        user_id: sourceClient!.userId,
        options,
    });

    if (!record) {
        throw new Error("Note does not exist.");
    }

    respond<GetNoteDetailsResponse>({
        type: "getNoteDetailsResponse",
        record,
    });
};

const handleFindNoteHistory: ListenerFn<FindNoteHistoryMessage> = async (
    {
        message: { note_id, page },
        sourceClient,
        respond,
    },
) => {
    if (
        !await repository.note.noteExists({
            note_id,
            user_id: sourceClient!.userId,
        })
    ) {
        throw new Error("Note does not exist.");
    }

    const records = await repository.noteHistory.findHistory({
        note_id,
        user_id: sourceClient!.userId,
        page,
    });

    respond<FindNoteHistoryResponse>({
        type: "findNoteHistoryResponse",
        records,
    });
};

const handleGetNoteHistoryData: ListenerFn<GetNoteHistoryDataMessage> = async (
    {
        message: { id },
        sourceClient,
        respond,
    },
) => {
    const data = await repository.noteHistory.getHistoryRecordData({
        id,
        user_id: sourceClient!.userId,
    });

    if (!data) {
        throw new Error("Note history data does not exist.");
    }

    respond<GetNoteHistoryDataResponse>({
        type: "getNoteHistoryDataResponse",
        data,
    });
};

const handleRevertNoteToHistory: ListenerFn<RevertNoteToHistoryMessage> =
    async ({ message: { note_id, to_history_id }, sourceClient, respond }) => {
        const data = await repository.noteHistory.getHistoryRecordData({
            id: to_history_id,
            user_id: sourceClient!.userId,
        });

        if (!data) {
            throw new Error("Note history data does not exist.");
        }

        await action.note.updateNote({
            data: {
                title: data.title,
                text: data.note,
                tags: data.tags ? data.tags.split(",") : [],
                is_encrypted: !!data.is_encrypted,
            },
            backend_data: {
                noteId: note_id,
                userId: sourceClient!.userId,
                isHistoryReversal: true,
            },
        });

        respond<RevertNoteToHistoryResponse>({
            type: "revertNoteToHistoryResponse",
            note_id,
            title: data.title,
            note: data.note,
            is_encrypted: data.is_encrypted,
            tags: data.tags ? data.tags.split(",") : [],
        });
    };

const handleDeleteHistoryRecord: ListenerFn<DeleteHistoryRecordMessage> =
    async ({
        message: { id, note_id },
        sourceClient,
        respond,
    }) => {
        if (
            !await repository.note.noteExists({
                note_id,
                user_id: sourceClient!.userId,
            })
        ) {
            throw new Error("Note does not exist.");
        }

        await repository.noteHistory.deleteHistoryRecord({
            id,
            note_id,
        });

        respond<DeleteHistoryRecordResponse>({
            type: "deleteHistoryRecordResponse",
            id,
        });
    };

const handleCreatePublicShare: ListenerFn<CreatePublicShareMessage> = async (
    { message: { note_id, expires_at }, sourceClient, respond },
) => {
    if (
        !await repository.note.noteExists({
            note_id,
            user_id: sourceClient!.userId,
        })
    ) {
        throw new Error("Note does not exist.");
    }

    const record = await repository.noteShare.createPublicShare({
        note_id,
        expires_at,
    });

    respond<CreatePublicShareResponse>({
        type: "createPublicShareResponse",
        record,
    });
};

const handleShareToUsers: ListenerFn<ShareToUsersMessage> = async (
    { message: { note_id, user_ids }, sourceClient, respond },
) => {
    if (
        !await repository.note.noteExists({
            note_id,
            user_id: sourceClient!.userId,
        })
    ) {
        throw new Error("Note does not exist.");
    }

    const { shared_to_user_ids } = await repository.noteShare.setUserShare({
        note_id,
        user_ids,
    });

    respond<ShareToUsersResponse>({
        type: "shareToUsersResponse",
    });

    if (shared_to_user_ids.length === 0) {
        return;
    }

    const note = await repository.note.getNoteInfo(note_id);

    const notifications = [];
    for (const userId of shared_to_user_ids) {
        notifications.push(runSendNotificationAction({
            type: "note-shared",
            payload: {
                id: note_id,
                title: note?.title ?? "Unknown",
                user_name: note?.user_name ?? "Unknown User",
            },
        }, userId));
    }

    await Promise.all(notifications);
};

const handleGetNoteShareData: ListenerFn<GetNoteShareDataMessage> = async (
    { message: { note_id }, sourceClient, respond },
) => {
    if (
        !await repository.note.noteExists({
            note_id,
            user_id: sourceClient!.userId,
        })
    ) {
        throw new Error("Note does not exist.");
    }

    const data = await repository.noteShare.getNoteShareData(note_id);

    respond<GetNoteShareDataResponse>({
        type: "getNoteShareDataResponse",
        ...data,
    });
};

const handleRemovePublicShare: ListenerFn<RemovePublicShareMessage> = async (
    { message: { note_id, id }, sourceClient, respond },
) => {
    if (
        !await repository.note.noteExists({
            note_id,
            user_id: sourceClient!.userId,
        })
    ) {
        throw new Error("Note does not exist.");
    }

    await repository.noteShare.removePublicShare(id);

    respond<RemovePublicShareResponse>({
        type: "removePublicShareResponse",
        removed_id: id,
    });
};

const handleFindSharedNotes: ListenerFn<FindSharedNotesMessage> = async (
    { message: { filters }, sourceClient, respond },
) => {
    const records = await repository.noteShare.findUserSharedNotes({
        filters,
        user_id: sourceClient!.userId,
    });

    respond<FindSharedNotesResponse>({
        type: "findSharedNotesResponse",
        records,
    });
};

const handleSetReminder: ListenerFn<SetReminderMessage> = async (
    {
        message: { namespace: _1, requestId: _2, type: _3, ...reminderData },
        sourceClient,
        respond,
    },
) => {
    const ownNote = await repository.note.noteExists({
        note_id: reminderData.note_id,
        user_id: sourceClient!.userId,
    });

    if (!ownNote) {
        const sharedNote = await repository.noteShare.sharedNoteWithUser({
            note_id: reminderData.note_id,
            user_id: sourceClient!.userId,
        });

        if (!sharedNote) {
            throw new Error(
                "Note does not exist or not shared with this user.",
            );
        }
    }

    await requireValidSchema<SetReminderRequest>(
        setReminderSchema,
        reminderData,
    );

    const result = await repository.noteReminder.setReminder({
        ...reminderData,
        user_id: sourceClient?.userId!,
    });

    respond<SetReminderResponse>({
        type: "setReminderResponse",
        note_id: reminderData.note_id,
        data: result,
    });
};

const handleRemoveReminder: ListenerFn<RemoveReminderMessage> = async (
    { message: { note_id }, sourceClient, respond },
) => {
    await repository.noteReminder.removeReminder({
        note_id,
        user_id: sourceClient!.userId,
    });

    respond<RemoveReminderResponse>({
        type: "removeReminderResponse",
        note_id,
    });
};

const handleFindNoteReminders: ListenerFn<FindNoteRemindersMessage> = async (
    { message: { filters }, sourceClient, respond },
) => {
    const records = await repository.noteReminder.findUserReminderNotes({
        filters,
        user_id: sourceClient!.userId,
    });

    respond<FindNoteRemindersResponse>({
        type: "findNoteRemindersResponse",
        records,
    });
};

const handleGetNoteReminderData: ListenerFn<GetNoteReminderDataMessage> =
    async (
        { message: { note_id }, sourceClient, respond },
    ) => {
        respond<GetNoteReminderDataResponse>({
            type: "getNoteReminderDataResponse",
            data: await repository.noteReminder.getNoteReminderData({
                note_id,
                user_id: sourceClient!.userId,
            }),
        });
    };

const handleSearchNote: ListenerFn<SearchNoteMessage> = async (
    { message: { filters }, sourceClient, respond },
) => {
    let results: NoteSearchResult[] = [];

    switch (filters.type) {
        case "general":
            results = await repository.noteSearch.searchGeneral({
                filters,
                user_id: sourceClient!.userId,
            });
            break;
        case "shared":
            results = await repository.noteSearch.searchSharedNotes({
                filters,
                user_id: sourceClient!.userId,
            });
            break;
        case "reminders":
            results = await repository.noteSearch.searchReminderNotes({
                filters,
                user_id: sourceClient!.userId,
            });
            break;
        case "recycleBin":
            results = await repository.noteSearch.searchDeletedNotes({
                filters,
                user_id: sourceClient!.userId,
            });
            break;
    }

    respond<SearchNoteResponse>({
        type: "searchNoteResponse",
        results,
    });
};

const handleGetRecentlyOpenedNotes: ListenerFn<GetRecentlyOpenedNotesMessage> =
    async (
        { sourceClient, respond },
    ) => {
        const records = await repository.note.findRecentlyOpenedNotes(
            sourceClient!.userId,
        );

        respond<GetRecentlyOpenedNotesResponse>({
            type: "getRecentlyOpenedNotesResponse",
            records,
        });
    };

const handleFindDeletedNotes: ListenerFn<FindDeletedNotesMessage> = async (
    { message: { filters }, sourceClient, respond },
) => {
    const records = await repository.note.findDeletedNotes({
        filters,
        user_id: sourceClient!.userId,
    });

    respond<FindDeletedNotesResponse>({
        type: "findDeletedNotesResponse",
        records,
    });
};

const handleRestoreDeletedNote: ListenerFn<RestoreDeletedNoteMessage> = async (
    { message: { id }, sourceClient, respond },
) => {
    await repository.note.restoreDeletedNote({
        note_id: id,
        user_id: sourceClient!.userId,
    });

    respond<RestoreDeletedNoteResponse>({
        type: "restoreDeletedNoteResponse",
        restored_note: await repository.note.getNote({
            id,
            user_id: sourceClient!.userId,
        }),
    });
};

const handleFullyDeleteNote: ListenerFn<FullyDeleteNoteMessage> = async (
    { message: { id }, sourceClient, respond },
) => {
    if (
        !await repository.note.noteExists({
            note_id: id,
            user_id: sourceClient!.userId,
            is_deleted: true,
        })
    ) {
        throw new Error("Note does not exist.");
    }

    await repository.note.fullyDeleteNotes([id]);

    respond<FullyDeleteNoteResponse>({
        type: "fullyDeleteNoteResponse",
        deleted_id: id,
    });
};

export const frontendMap: RegisterListenerMap<NoteFrontendMessage> = {
    createNote: handleCreateNote,
    updateNote: handleUpdateNote,
    deleteNote: handleDeleteNote,
    getNoteDetails: handleGetNoteDetails,
    findNoteHistory: handleFindNoteHistory,
    getNoteHistoryData: handleGetNoteHistoryData,
    revertNoteToHistory: handleRevertNoteToHistory,
    deleteHistoryRecord: handleDeleteHistoryRecord,
    createPublicShare: handleCreatePublicShare,
    removePublicShare: handleRemovePublicShare,
    shareToUsers: handleShareToUsers,
    getNoteShareData: handleGetNoteShareData,
    findSharedNotes: handleFindSharedNotes,
    setReminder: handleSetReminder,
    findNoteReminders: handleFindNoteReminders,
    removeReminder: handleRemoveReminder,
    getNoteReminderData: handleGetNoteReminderData,
    searchNote: handleSearchNote,
    getRecentlyOpenedNotes: handleGetRecentlyOpenedNotes,
    findDeletedNotes: handleFindDeletedNotes,
    restoreDeletedNote: handleRestoreDeletedNote,
    fullyDeleteNote: handleFullyDeleteNote,
};
