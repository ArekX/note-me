import { db } from "$backend/database.ts";
import { getCurrentUnixTimestamp } from "$lib/time/unix.ts";
import { sql } from "$lib/kysely-sqlite-dialect/deps.ts";
import { getNote } from "./note-repository.ts";
import { Paged, pageResults } from "$lib/kysely-sqlite-dialect/pagination.ts";
import { NoteHistoryTable, RecordId } from "$types";

export interface AddHistoryData {
    note_id: number;
    user_id: number;
    is_reversal?: boolean;
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
        version: data.is_reversal
            ? `Version ${count + 1} (before reversal)`
            : `Version ${count + 1}`,
        created_at: getCurrentUnixTimestamp(),
        note_id: noteData.id,
        note: noteData.note,
        title: noteData.title,
        is_encrypted: noteData.is_encrypted,
        tags: noteData.tags.join(","),
    }).execute();
};

export type NoteHistoryMetaRecord =
    & Pick<
        NoteHistoryTable,
        | "version"
        | "created_at"
        | "is_encrypted"
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
            "note_history.is_encrypted",
        ])
        .where("note_history.note_id", "=", note_id)
        .innerJoin(
            "note",
            (e) =>
                e.onRef("note_history.note_id", "=", "note.id")
                    .on("note.user_id", "=", user_id),
        )
        .orderBy("note_history.created_at", "desc");

    return await pageResults(query, page, 20);
};

export type NoteHistoryDataRecord = Pick<
    NoteHistoryTable,
    | "version"
    | "note"
    | "title"
    | "is_encrypted"
    | "tags"
>;

export const getHistoryRecordData = async (
    id: number,
    user_id: number,
): Promise<NoteHistoryDataRecord | null> => {
    return await db.selectFrom("note_history")
        .select([
            "note_history.version",
            "note_history.note",
            "note_history.is_encrypted",
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

export const deleteHistoryRecord = async (
    id: number,
    note_id: number,
): Promise<void> => {
    await db.deleteFrom("note_history")
        .where("id", "=", id)
        .where("note_id", "=", note_id)
        .execute();
};
