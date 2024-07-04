import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";

import {
    CreateNoteResponse,
    CreatePublicShareMessage,
    CreatePublicShareResponse,
    DeleteHistoryRecordMessage,
    DeleteHistoryRecordResponse,
    DeleteNoteMessage,
    DeleteNoteResponse,
    FindNoteHistoryMessage,
    FindNoteHistoryResponse,
    FindNoteRemindersMessage,
    FindNoteRemindersResponse,
    FindSharedNotesMessage,
    FindSharedNotesResponse,
    GetNoteDetailsResponse,
    GetNoteHistoryDataMessage,
    GetNoteHistoryDataResponse,
    GetNoteMessage,
    GetNoteReminderDataMessage,
    GetNoteReminderDataResponse,
    GetNoteResponse,
    GetNoteShareDataMessage,
    GetNoteShareDataResponse,
    NoteFrontendMessage,
    RemovePublicShareMessage,
    RemovePublicShareResponse,
    RemoveReminderMessage,
    RemoveReminderResponse,
    RevertNoteToHistoryMessage,
    RevertNoteToHistoryResponse,
    SetReminderMessage,
    SetReminderResponse,
    ShareToUsersMessage,
    ShareToUsersResponse,
    UpdateNoteMessage,
    UpdateNoteResponse,
} from "./messages.ts";
import { CreateNoteMessage } from "$workers/websocket/api/notes/messages.ts";
import {
    createNote,
    deleteNote,
    getNote,
    getNoteDetails,
    getNoteShareDetails,
    noteExists,
} from "$backend/repository/note-repository.ts";
import {
    beginTransaction,
    commitTransaction,
    rollbackTransaction,
} from "$backend/database.ts";
import { linkNoteWithTags } from "$backend/repository/note-tags-repository.ts";
import { assignNoteToGroup } from "$backend/repository/group-repository.ts";
import { requireValidSchema } from "$schemas/mod.ts";
import {
    addNoteRequestSchema,
    SetReminderRequest,
    setReminderSchema,
} from "$schemas/notes.ts";
import {
    deleteHistoryRecord,
    findHistory,
    getHistoryRecordData,
} from "$backend/repository/note-history-repository.ts";
import { runUpdateNoteAction } from "$backend/actions/update-note-action.ts";
import { GetNoteDetailsMessage } from "$workers/websocket/api/notes/messages.ts";
import {
    createPublicShare,
    findUserSharedNotes,
    getNoteShareData,
    removePublicShare,
    setUserShare,
} from "$backend/repository/note-share-repository.ts";
import { runSendNotificationAction } from "$backend/actions/send-notification-action.ts";
import {
    findUserReminderNotes,
    getNoteReminderData,
    removeReminder,
    setReminder,
} from "$backend/repository/note-reminder-repository.ts";

const handleCreateNote: ListenerFn<CreateNoteMessage> = async (
    { message: { data }, sourceClient, respond },
) => {
    await requireValidSchema(addNoteRequestSchema, data);

    await beginTransaction();

    try {
        const record = await createNote({
            title: data.title,
            note: data.text,
            user_id: sourceClient!.userId,
        });

        await Promise.all([
            linkNoteWithTags(record.id, sourceClient!.userId, data.tags),
            assignNoteToGroup(data.group_id, record.id, sourceClient!.userId),
        ]);

        await commitTransaction();

        respond<CreateNoteResponse>({
            type: "createNoteResponse",
            record,
            group_id: data.group_id,
        });
    } catch (e) {
        await rollbackTransaction();
        throw e;
    }
};

const handleUpdateNote: ListenerFn<UpdateNoteMessage> = async (
    { message: { id, data }, sourceClient, respond },
) => {
    await runUpdateNoteAction(data, {
        noteId: id,
        userId: sourceClient!.userId,
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
    if (!await noteExists(id, sourceClient!.userId)) {
        throw new Error("Note does not exist.");
    }

    await deleteNote(id, sourceClient!.userId);

    respond<DeleteNoteResponse>({
        type: "deleteNoteResponse",
        deleted_id: id,
    });
};

const handleGetNote: ListenerFn<GetNoteMessage> = async (
    { message: { id }, sourceClient, respond },
) => {
    const record = await getNote(id, sourceClient!.userId);

    if (!record) {
        throw new Error("Note does not exist.");
    }

    respond<GetNoteResponse>({
        type: "getNoteResponse",
        record,
    });
};

const handleGetNoteDetails: ListenerFn<GetNoteDetailsMessage> = async (
    { message: { id }, sourceClient, respond },
) => {
    const record = await getNoteDetails(id, sourceClient!.userId);

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
    if (!await noteExists(note_id, sourceClient!.userId)) {
        throw new Error("Note does not exist.");
    }

    const records = await findHistory(note_id, sourceClient!.userId, page);

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
    const data = await getHistoryRecordData(
        id,
        sourceClient!.userId,
    );

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
        const data = await getHistoryRecordData(
            to_history_id,
            sourceClient!.userId,
        );

        if (!data) {
            throw new Error("Note history data does not exist.");
        }

        await runUpdateNoteAction({
            title: data.title,
            text: data.note,
            tags: data.tags ? data.tags.split(",") : [],
        }, {
            noteId: note_id,
            userId: sourceClient!.userId,
            newHistoryVersionName: `Reverted to "${data.version}"`,
        });

        respond<RevertNoteToHistoryResponse>({
            type: "revertNoteToHistoryResponse",
            note_id,
            title: data.title,
            note: data.note,
            tags: data.tags ? data.tags.split(",") : [],
        });
    };

const handleDeleteHistoryRecord: ListenerFn<DeleteHistoryRecordMessage> =
    async ({
        message: { id, note_id },
        sourceClient,
        respond,
    }) => {
        if (!await noteExists(note_id, sourceClient!.userId)) {
            throw new Error("Note does not exist.");
        }

        await deleteHistoryRecord(id, note_id);

        respond<DeleteHistoryRecordResponse>({
            type: "deleteHistoryRecordResponse",
            id,
        });
    };

const handleCreatePublicShare: ListenerFn<CreatePublicShareMessage> = async (
    { message: { note_id, expires_at }, sourceClient, respond },
) => {
    if (!await noteExists(note_id, sourceClient!.userId)) {
        throw new Error("Note does not exist.");
    }

    const record = await createPublicShare({ note_id, expires_at });

    respond<CreatePublicShareResponse>({
        type: "createPublicShareResponse",
        record,
    });
};

const handleShareToUsers: ListenerFn<ShareToUsersMessage> = async (
    { message: { note_id, user_ids }, sourceClient, respond },
) => {
    if (!await noteExists(note_id, sourceClient!.userId)) {
        throw new Error("Note does not exist.");
    }

    const { shared_to_user_ids } = await setUserShare({ note_id, user_ids });

    respond<ShareToUsersResponse>({
        type: "shareToUsersResponse",
    });

    if (shared_to_user_ids.length === 0) {
        return;
    }

    const note = await getNoteShareDetails(note_id);

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
    if (!await noteExists(note_id, sourceClient!.userId)) {
        throw new Error("Note does not exist.");
    }

    const data = await getNoteShareData(note_id);

    respond<GetNoteShareDataResponse>({
        type: "getNoteShareDataResponse",
        ...data,
    });
};

const handleRemovePublicShare: ListenerFn<RemovePublicShareMessage> = async (
    { message: { note_id, id }, sourceClient, respond },
) => {
    if (!await noteExists(note_id, sourceClient!.userId)) {
        throw new Error("Note does not exist.");
    }

    await removePublicShare(id);

    respond<RemovePublicShareResponse>({
        type: "removePublicShareResponse",
        removed_id: id,
    });
};

const handleFindSharedNotes: ListenerFn<FindSharedNotesMessage> = async (
    { message: { filters, page }, sourceClient, respond },
) => {
    const records = await findUserSharedNotes(
        filters,
        sourceClient!.userId,
        page,
    );

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
    await requireValidSchema<SetReminderRequest>(
        setReminderSchema,
        reminderData,
    );

    await setReminder({
        ...reminderData,
        user_id: sourceClient?.userId!,
    });

    respond<SetReminderResponse>({
        type: "setReminderResponse",
        note_id: reminderData.note_id,
    });
};

const handleRemoveReminder: ListenerFn<RemoveReminderMessage> = async (
    { message: { note_id }, sourceClient, respond },
) => {
    await removeReminder(note_id, sourceClient!.userId);

    respond<RemoveReminderResponse>({
        type: "removeReminderResponse",
        note_id,
    });
};

const handleFindNoteReminders: ListenerFn<FindNoteRemindersMessage> = async (
    { message: { filters, page }, sourceClient, respond },
) => {
    const records = await findUserReminderNotes(
        filters,
        sourceClient!.userId,
        page,
    );

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
            data: await getNoteReminderData(note_id, sourceClient!.userId),
        });
    };

export const frontendMap: RegisterListenerMap<NoteFrontendMessage> = {
    createNote: handleCreateNote,
    updateNote: handleUpdateNote,
    deleteNote: handleDeleteNote,
    getNote: handleGetNote,
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
};
