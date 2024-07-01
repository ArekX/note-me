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

export type UpdateNote = Partial<Pick<NoteTable, "title" | "note">>;

export const updateNote = async (
    id: number,
    user_id: number,
    note: UpdateNote,
): Promise<boolean> => {
    const record = {
        ...note,
        updated_at: getCurrentUnixTimestamp(),
    };

    const result = await db.updateTable("note")
        .set(record)
        .where("id", "=", id)
        .where("user_id", "=", user_id)
        .where("is_deleted", "=", false)
        .executeTakeFirst();

    return result.numUpdatedRows > 0;
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
    updated_at: number;
}

export const getNoteTagsSql = () =>
    sql<string>`(
        SELECT GROUP_CONCAT(note_tag.name, ',')
        FROM note_tag
        INNER JOIN note_tag_note ON note_tag_note.note_id = note.id AND note_tag.id = note_tag_note.tag_id
    )`;

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
            getNoteTagsSql().as("tags"),
            "note.updated_at",
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

export interface NoteDetailsRecord {
    group_id: number;
    group_name: string;
    created_at: number;
    updated_at: number;
    user_name: string;
    note: string;
}

export const getNoteDetails = async (
    note_id: number,
    user_id: number,
): Promise<NoteDetailsRecord | null> => {
    const result = await db.selectFrom("note")
        .select([
            sql<number>`\`group\`.id`.as("group_id"),
            sql<string>`\`group\`.name`.as("group_name"),
            "note.created_at",
            "note.updated_at",
            sql<string>`user.name`.as("user_name"),
            "note.note",
        ])
        .where("note.id", "=", note_id)
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
        .leftJoin("user", "note.user_id", "user.id")
        .executeTakeFirst();

    return result ?? null;
};

export interface NoteShareData {
    id: number;
    title: string;
    user_name: string;
}

export const getNoteShareDetails = async (
    note_id: number,
): Promise<NoteShareData | null> => {
    const result = await db.selectFrom("note")
        .select([
            "note.id",
            "note.title",
            sql<string>`user.name`.as("user_name"),
        ])
        .where("note.id", "=", note_id)
        .where("note.is_deleted", "=", false)
        .innerJoin("user", "user.id", "note.user_id")
        .executeTakeFirst();

    return result ?? null;
};

export const deleteNote = async (
    note_id: number,
    user_id: number,
): Promise<boolean> => {
    const result = await db.updateTable("note")
        .set({
            is_deleted: true,
        })
        .where("id", "=", note_id)
        .where("user_id", "=", user_id)
        .where("is_deleted", "=", false)
        .executeTakeFirst();

    return result.numUpdatedRows > 0;
};

export const noteExists = async (
    note_id: number,
    user_id: number,
): Promise<boolean> => {
    const result = await db.selectFrom("note")
        .select(sql<number>`1`.as("exists"))
        .where("id", "=", note_id)
        .where("user_id", "=", user_id)
        .executeTakeFirst();

    return (result?.exists ?? 0) > 0;
};
