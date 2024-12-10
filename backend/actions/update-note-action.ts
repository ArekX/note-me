import { requireValidSchema } from "$schemas/mod.ts";
import { updateNoteSchema } from "$schemas/notes.ts";
import { createTransaction } from "$backend/database.ts";
import { when } from "$backend/promise.ts";
import { db } from "$workers/database/lib.ts";

export interface UpdateNoteData {
    title?: string;
    text?: string;
    tags?: string[];
    is_encrypted?: boolean;
    group_id?: number | null | undefined;
}

export interface BackendData {
    noteId: number;
    userId: number;
    isHistoryReversal?: boolean;
}

export const runUpdateNoteAction = async (
    data: UpdateNoteData,
    backend_data: BackendData,
): Promise<boolean> => {
    if (Object.keys(data).length === 0) {
        return false;
    }

    await requireValidSchema(updateNoteSchema, data);

    if (
        !await db.note.noteExists({
            note_id: backend_data.noteId,
            user_id: backend_data.userId,
        })
    ) {
        throw new Error("Note does not exist.");
    }

    const transaction = await createTransaction();

    return await transaction.run(async () => {
        await db.noteHistory.addHistory({
            note_id: backend_data.noteId,
            user_id: backend_data.userId,
            is_reversal: backend_data.isHistoryReversal,
        });

        await Promise.all([
            when(
                () => "group_id" in data,
                () =>
                    db.note.updateNoteParent({
                        note_id: backend_data.noteId,
                        user_id: backend_data.userId,
                        new_parent_id: data.group_id ? +data.group_id : null,
                    }),
                () => Promise.resolve(true),
            ),
            when(
                () => [data.title, data.text].some(Boolean),
                () =>
                    db.note.updateNote({
                        id: backend_data.noteId,
                        user_id: backend_data.userId,
                        note: {
                            title: data.title,
                            note: data.text,
                            is_encrypted: data.is_encrypted,
                        },
                    }),
                () => Promise.resolve(true),
            ),
            when(
                () => !!data.tags,
                () =>
                    db.noteTags.linkNoteWithTags({
                        note_id: backend_data.noteId,
                        user_id: backend_data.userId,
                        tags: data.tags!,
                    }),
                () => Promise.resolve(true),
            ),
        ]);

        return true;
    });
};
