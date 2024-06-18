import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";

import {
    CreateNoteResponse,
    DeleteNoteMessage,
    DeleteNoteResponse,
    NoteFrontendMessage,
    UpdateNoteMessage,
    UpdateNoteResponse,
} from "./messages.ts";
import { CreateNoteMessage } from "$workers/websocket/api/notes/messages.ts";
import {
    createNote,
    deleteNote,
    noteExists,
    updateNote,
    updateNoteParent,
} from "$backend/repository/note-repository.ts";
import {
    beginTransaction,
    commitTransaction,
    rollbackTransaction,
} from "$backend/database.ts";
import { linkNoteWithTags } from "$backend/repository/note-tags-repository.ts";
import { assignNoteToGroup } from "$backend/repository/group-repository.ts";
import { when } from "$backend/promise.ts";
import { requireValidSchema } from "$schemas/mod.ts";
import { addNoteRequestSchema, updateNoteSchema } from "$schemas/notes.ts";
import { addHistory } from "$backend/repository/note-history-repository.ts";

const createNoteRequest: ListenerFn<CreateNoteMessage> = async (
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

const updateNoteRequest: ListenerFn<UpdateNoteMessage> = async (
    { message: { id, data }, sourceClient, respond },
) => {
    if (Object.keys(data).length === 0) {
        respond<UpdateNoteResponse>({
            type: "updateNoteResponse",
            updatedId: id,
            updatedData: data,
        });
        return;
    }

    await requireValidSchema(updateNoteSchema, data);

    if (!await noteExists(id, sourceClient!.userId)) {
        throw new Error("Note does not exist.");
    }

    await beginTransaction();

    const userId = sourceClient!.userId;

    try {
        await addHistory({
            note_id: id,
            user_id: sourceClient!.userId,
        });

        await Promise.all([
            when(
                () => "group_id" in data,
                () =>
                    updateNoteParent(
                        id,
                        data.group_id ? +data.group_id : null,
                        userId,
                    ),
                () => Promise.resolve(true),
            ),
            when(
                () => [data.title, data.text].some(Boolean),
                () =>
                    updateNote(
                        id,
                        userId,
                        {
                            title: data.title,
                            note: data.text,
                        },
                    ),
                () => Promise.resolve(true),
            ),
            when(
                () => !!data.tags,
                () => linkNoteWithTags(id, userId, data.tags!),
                () => Promise.resolve(true),
            ),
        ]);

        await commitTransaction();

        respond<UpdateNoteResponse>({
            type: "updateNoteResponse",
            updatedId: id,
            updatedData: data,
        });
    } catch (e) {
        await rollbackTransaction();
        throw e;
    }
};

const deleteNoteRequest: ListenerFn<DeleteNoteMessage> = async (
    { message: { id }, sourceClient, respond },
) => {
    if (!await noteExists(id, sourceClient!.userId)) {
        throw new Error("Note does not exist.");
    }

    await deleteNote(id, sourceClient!.userId);

    respond<DeleteNoteResponse>({
        type: "deleteNoteResponse",
        deletedId: id,
    });
};

export const frontendMap: RegisterListenerMap<NoteFrontendMessage> = {
    createNote: createNoteRequest,
    updateNote: updateNoteRequest,
    deleteNote: deleteNoteRequest,
};
