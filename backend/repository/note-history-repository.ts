import { db } from "$backend/database.ts";
import { getCurrentUnixTimestamp } from "$backend/time.ts";
import { sql } from "$lib/kysely-sqlite-dialect/deps.ts";
import { getNote } from "$backend/repository/note-repository.ts";

interface AddHistoryData {
    note_id: number;
    user_id: number;
}

export const addHistory = async (data: AddHistoryData): Promise<void> => {
    const noteData = await getNote(data.note_id, data.user_id);

    if (!noteData) {
        throw new Error("Note does not exist.");
    }

    const { count } = await db.selectFrom("note_history")
        .select(
            sql<number>`COUNT(*)`.as("count"),
        ).where("note_id", "=", data.note_id)
        .executeTakeFirst() ?? { count: 0 };

    await db.insertInto("note_history").values({
        version: `Version ${count + 1}`,
        created_at: getCurrentUnixTimestamp(),
        note_id: noteData.id,
        note: noteData.note,
        title: noteData.title,
        tags: noteData.tags.join(","),
    }).execute();
};
