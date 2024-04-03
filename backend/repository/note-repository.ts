import { NoteTable } from "$types";
import { db } from "$backend/database.ts";
import { getCurrentUnixTimestamp } from "$backend/time.ts";
import { sql } from "../../lib/kysely-sqlite-dialect/deps.ts";

type NoteId = { id: number };

export type NewNote = Omit<
    NoteTable,
    "id" | "created_at" | "updated_at" | "is_deleted"
>;

export type NoteRecord = Omit<NoteTable, "id"> & NoteId;

export const createNote = async (note: NewNote): Promise<NoteRecord> => {
    const newRecord = {
        ...note,
        created_at: getCurrentUnixTimestamp(),
        updated_at: getCurrentUnixTimestamp(),
    };

    const result = await db.insertInto("note")
        .values(newRecord)
        .executeTakeFirst();

    if (!result) {
        throw new Error("Could not create note!");
    }

    return {
        id: Number(result.insertId),
        ...newRecord,
    };
};

export const updateNoteParent = async (
    note_id: number,
    new_parent_id: number | null,
    user_id: number,
): Promise<boolean> => {
    const result = await db.updateTable("group_note")
        .set({
            group_id: new_parent_id,
        })
        .where("note_id", "=", note_id)
        .where("user_id", "=", user_id)
        .executeTakeFirst();

    return result.numUpdatedRows > 0;
};

export interface ViewNoteRecord {
    id: number;
    title: string;
    note: string;
    group_id: number;
    group_name: string;
    tags: string[];
}

export const getNote = async (
    id: number,
    user_id: number,
): Promise<ViewNoteRecord | null> => {
    const result = await db.selectFrom("note")
        .select([
            "note.id",
            "title",
            "note",
            sql<number>`\`group\`.id`.as("group_id"),
            sql<string>`\`group\`.name`.as("group_name"),
            sql<string>`(
                SELECT GROUP_CONCAT(note_tag.name, ',')
                FROM note_tag
                INNER JOIN note_tag_note ON note_tag_note.note_id = note.id AND note_tag.id = note_tag_note.tag_id
            )`.as("tags"),
        ])
        .where("note.id", "=", id)
        .where("note.user_id", "=", user_id)
        .where("note.is_deleted", "=", false)
        .leftJoin(
            "group_note",
            (join) =>
                join
                    .onRef("note.id", "=", "group_note.note_id")
                    .on("group_note.user_id", "=", user_id),
        )
        .leftJoin("group", "group_note.group_id", "group.id")
        .executeTakeFirst();

    if (!result) {
        return null;
    }

    return {
        ...result,
        tags: (result.tags ?? "").split?.(",").filter(Boolean),
    };
};
