import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";

import {
    CreateNoteResponse,
    DeleteHistoryRecordMessage,
    DeleteHistoryRecordResponse,
    DeleteNoteMessage,
    DeleteNoteResponse,
    FindNoteHistoryMessage,
    FindNoteHistoryResponse,
    GetNoteDetailsResponse,
    GetNoteHistoryDataMessage,
    GetNoteHistoryDataResponse,
    GetNoteMessage,
    GetNoteResponse,
    NoteFrontendMessage,
    RevertNoteToHistoryMessage,
    RevertNoteToHistoryResponse,
    UpdateNoteMessage,
    UpdateNoteResponse,
} from "./messages.ts";
import { CreateNoteMessage } from "$workers/websocket/api/notes/messages.ts";
import {
    createNote,
    deleteNote,
    getNote,
    getNoteDetails,
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
import { addNoteRequestSchema } from "$schemas/notes.ts";
import {
    deleteHistoryRecord,
    findHistory,
    getHistoryRecordData,
} from "$backend/repository/note-history-repository.ts";
import { runUpdateNoteAction } from "$backend/actions/update-note-action.ts";
import { GetNoteDetailsMessage } from "$workers/websocket/api/notes/messages.ts";

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
};
