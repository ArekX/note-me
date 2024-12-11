import { DbHandlerMap, DbRequest } from "$workers/database/message.ts";
import { createTransaction } from "$backend/database.ts";
import { createNote, NoteRecord } from "$backend/repository/note-repository.ts";
import { linkNoteWithTags } from "$backend/repository/note-tags-repository.ts";
import { assignNoteToGroup } from "$backend/repository/group-repository.ts";
import { CreateNoteMessage } from "$workers/websocket/api/notes/messages.ts";

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

export type NoteAction = CreateNote;

export const note: DbHandlerMap<NoteAction> = {
    createNote: async ({ data, user_id }) => {
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
    },
};
