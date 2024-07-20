import { NoteTable } from "$types";
import { db } from "$backend/database.ts";
import { getCurrentUnixTimestamp } from "$lib/time/unix.ts";
import { sql } from "$lib/kysely-sqlite-dialect/deps.ts";

type NoteId = { id: number };

export type NewNote = Omit<
    NoteTable,
    "id" | "created_at" | "updated_at" | "is_deleted" | "last_open_at"
>;

export type NoteRecord = Omit<NoteTable, "id"> & NoteId;

export const createNote = async (note: NewNote): Promise<NoteRecord> => {
    const newRecord = {
        ...note,
        last_open_at: null,
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
    is_encrypted: boolean;
    group_id: number | null;
    group_name: string | null;
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
            "is_encrypted",
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

export const updateLastOpenAt = async (
    note_id: number,
    user_id: number,
): Promise<boolean> => {
    const result = await db.updateTable("note")
        .set({
            last_open_at: getCurrentUnixTimestamp(),
        })
        .where("id", "=", note_id)
        .where("user_id", "=", user_id)
        .where("is_deleted", "=", false)
        .executeTakeFirst();

    return result.numUpdatedRows > 0;
};

export interface NoteDetailsRecord {
    group_id: number;
    group_name: string;
    created_at: number;
    updated_at: number;
    user_name: string;
    note: string;
    title: string;
}

export interface NoteDetailsOptions {
    include_group?: boolean;
    include_timestamp?: boolean;
    include_user?: boolean;
    include_title?: boolean;
    include_note?: boolean;
}

export const getNoteDetails = async (
    note_id: number,
    user_id: number,
    options: NoteDetailsOptions = {},
): Promise<NoteDetailsRecord | null> => {
    return await db.selectFrom("note")
        .select([
            options.include_group
                ? sql<number>`\`group\`.id`.as("group_id")
                : sql<number>`0`.as("group_id"),
            options.include_group
                ? sql<string>`\`group\`.name`.as("group_name")
                : sql<string>`''`.as("group_name"),
            options.include_timestamp
                ? "note.created_at"
                : sql<number>`0`.as("created_at"),
            options.include_timestamp
                ? "note.updated_at"
                : sql<number>`0`.as("updated_at"),
            options.include_user
                ? sql<string>`user.name`.as("user_name")
                : sql<string>`''`.as("user_name"),
            options.include_title
                ? "note.title"
                : sql<string>`''`.as("note.title"),
            options.include_note
                ? "note.note"
                : sql<string>`''`.as("note.note"),
            "note.is_encrypted",
        ])
        .leftJoin(
            "group_note",
            (join) =>
                join
                    .onRef("note.id", "=", "group_note.note_id")
                    .on("group_note.user_id", "=", user_id),
        )
        .leftJoin("group", "group_note.group_id", "group.id")
        .innerJoin("user", "user.id", "note.user_id")
        .where("note.id", "=", note_id)
        .where("note.user_id", "=", user_id)
        .where("note.is_deleted", "=", false)
        .executeTakeFirst() ?? null;
};

export interface NoteInfoRecord {
    id: number;
    title: string;
    user_name: string;
    user_id: number;
}

export const getNoteInfo = async (
    note_id: number,
): Promise<NoteInfoRecord | null> => {
    const result = await db.selectFrom("note")
        .select([
            "note.id",
            "note.title",
            sql<string>`user.name`.as("user_name"),
            sql<number>`user.id`.as("user_id"),
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

export const getUserNoteIds = async (
    parent_id: number,
    user_id: number,
): Promise<number[]> => {
    return (await db.selectFrom("group_note")
        .select([
            "note_id",
        ])
        .innerJoin("note", "note.id", "group_note.note_id")
        .where("group_note.group_id", "=", parent_id)
        .where("note.user_id", "=", user_id)
        .where("note.is_deleted", "=", false)
        .execute()).map((row) => row.note_id);
};

export const deleteUserNotesByParentId = async (
    parent_id: number,
    user_id: number,
): Promise<number> => {
    const deleted = await db.updateTable("note")
        .set({
            is_deleted: true,
        })
        .where(
            "note.id",
            "in",
            db.selectFrom("group_note")
                .select("note_id")
                .where("group_id", "=", parent_id),
        )
        .where("note.user_id", "=", user_id)
        .where("note.is_deleted", "=", false)
        .executeTakeFirst();

    return Number(deleted.numUpdatedRows);
};

export interface RecentNoteRecord {
    id: number;
    title: string;
    group_id: number | null;
    group_name: string | null;
    updated_at: number;
    last_open_at: number | null;
}

export const findRecentlyOpenedNotes = async (
    user_id: number,
): Promise<RecentNoteRecord[]> => {
    return await db.selectFrom("note")
        .select([
            "note.id",
            "note.title",
            sql<number>`\`group\`.id`.as("group_id"),
            sql<string>`\`group\`.name`.as("group_name"),
            "note.updated_at",
            "note.last_open_at",
        ])
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
        .orderBy("last_open_at", "desc")
        .limit(10)
        .execute();
};
