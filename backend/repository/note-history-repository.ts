import { db } from "$backend/database.ts";
import { getCurrentUnixTimestamp } from "$backend/time.ts";
import { sql } from "$lib/kysely-sqlite-dialect/deps.ts";
import { getNote } from "$backend/repository/note-repository.ts";
import { Paged, pageResults } from "$lib/kysely-sqlite-dialect/pagination.ts";
import { NoteHistoryTable, RecordId } from "$types";

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

export type NoteHistoryMetaRecord =
    & Pick<
        NoteHistoryTable,
        | "version"
        | "created_at"
    >
    & RecordId;

export const findHistory = async (
    note_id: number,
    user_id: number,
    page: number,
): Promise<Paged<NoteHistoryMetaRecord>> => {
    const query = db.selectFrom("note_history")
        .select([
            "note_history.id",
            "note_history.version",
            "note_history.created_at",
        ])
        .where("note_history.note_id", "=", note_id)
        .innerJoin(
            "note",
            (e) =>
                e.onRef("note_history.note_id", "=", "note.id")
                    .on("note.user_id", "=", user_id),
        )
        .orderBy("note_history.created_at", "desc");

    return await pageResults(query, page);
};

export type NoteHistoryDataRecord = Pick<
    NoteHistoryTable,
    | "note"
    | "title"
    | "tags"
>;

export const getHistoryRecordData = async (
    id: number,
    user_id: number,
): Promise<NoteHistoryDataRecord | null> => {
    return await db.selectFrom("note_history")
        .select([
            "note_history.note",
            "note_history.title",
            "note_history.tags",
        ])
        .where("note_history.id", "=", id)
        .innerJoin(
            "note",
            (e) =>
                e.onRef("note_history.note_id", "=", "note.id")
                    .on("note.user_id", "=", user_id),
        )
        .executeTakeFirst() ?? null;
};
