import { requireValidSchema } from "$schemas/mod.ts";
import { updateNoteSchema } from "$schemas/notes.ts";
import {
    noteExists,
    updateNote,
    updateNoteParent,
} from "$backend/repository/note-repository.ts";
import {
    beginTransaction,
    commitTransaction,
    rollbackTransaction,
} from "$backend/database.ts";
import { addHistory } from "$backend/repository/note-history-repository.ts";
import { when } from "$backend/promise.ts";
import { linkNoteWithTags } from "$backend/repository/note-tags-repository.ts";

export interface UpdateNoteData {
    title?: string;
    text?: string;
    tags?: string[];
    group_id?: number | null | undefined;
}

export interface BackendData {
    noteId: number;
    userId: number;
    newHistoryVersionName?: string;
}

export const runUpdateNoteAction = async (
    data: UpdateNoteData,
    backend_data: BackendData,
): Promise<boolean> => {
    if (Object.keys(data).length === 0) {
        return false;
    }

    await requireValidSchema(updateNoteSchema, data);

    if (!await noteExists(backend_data.noteId, backend_data.userId)) {
        throw new Error("Note does not exist.");
    }

    await beginTransaction();

    try {
        await addHistory({
            note_id: backend_data.noteId,
            user_id: backend_data.userId,
            new_version_name: backend_data.newHistoryVersionName,
        });

        await Promise.all([
            when(
                () => "group_id" in data,
                () =>
                    updateNoteParent(
                        backend_data.noteId,
                        data.group_id ? +data.group_id : null,
                        backend_data.userId,
                    ),
                () => Promise.resolve(true),
            ),
            when(
                () => [data.title, data.text].some(Boolean),
                () =>
                    updateNote(
                        backend_data.noteId,
                        backend_data.userId,
                        {
                            title: data.title,
                            note: data.text,
                        },
                    ),
                () => Promise.resolve(true),
            ),
            when(
                () => !!data.tags,
                () =>
                    linkNoteWithTags(
                        backend_data.noteId,
                        backend_data.userId,
                        data.tags!,
                    ),
                () => Promise.resolve(true),
            ),
        ]);

        await commitTransaction();

        return true;
    } catch (e) {
        await rollbackTransaction();
        throw e;
    }
};
