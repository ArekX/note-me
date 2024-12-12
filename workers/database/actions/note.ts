import { DbHandlerMap, DbRequest } from "$workers/database/message.ts";
import { createTransaction } from "$backend/database.ts";
import { createNote, NoteRecord } from "../query/note-repository.ts";
import { linkNoteWithTags } from "../query/note-tags-repository.ts";
import { assignNoteToGroup } from "../query/group-repository.ts";
import { CreateNoteMessage } from "$workers/websocket/api/notes/messages.ts";
import {
    BackendData,
    runUpdateNoteAction,
    UpdateNoteData,
} from "$backend/actions/update-note-action.ts";

type NoteRequest<Key extends string, Request, Response> = DbRequest<
    "note",
    "action",
    Key,
    Request,
    Response
>;

type CreateNote = NoteRequest<"createNote", {
    data: CreateNoteMessage["data"];
    user_id: number;
}, NoteRecord>;
type UpdateNote = NoteRequest<"updateNote", {
    data: UpdateNoteData;
    backend_data: BackendData;
}, boolean>;

export type NoteAction = CreateNote | UpdateNote;

type HandlerMap = DbHandlerMap<NoteAction>;

const createNoteAction: HandlerMap["createNote"] = async (
    { data, user_id },
) => {
    const transaction = await createTransaction();

    const record = await transaction.run(async () => {
        const record = await createNote({
            title: data.title,
            note: data.text,
            is_encrypted: data.is_encrypted,
            user_id,
        });

        await Promise.all([
            linkNoteWithTags(record.id, user_id, data.tags),
            assignNoteToGroup(
                data.group_id,
                record.id,
                user_id,
            ),
        ]);

        return record;
    });

    return record;
};

export const note: HandlerMap = {
    createNote: createNoteAction,
    updateNote: ({ data, backend_data }) =>
        runUpdateNoteAction(data, backend_data),
};
