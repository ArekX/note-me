import { FileTable } from "../../types/tables.ts";
import { db } from "$backend/database.ts";
import { applyFilters } from "$lib/kysely-sqlite-dialect/filters.ts";
import { Paged, pageResults } from "$lib/kysely-sqlite-dialect/pagination.ts";
import { sql } from "$lib/kysely-sqlite-dialect/deps.ts";

export type NewFileRecord = Pick<
    FileTable,
    "identifier" | "name" | "user_id" | "mime_type" | "size"
>;

export const createFileRecord = async (data: NewFileRecord): Promise<void> => {
    await db.insertInto("file")
        .values({
            ...data,
            created_at: Date.now(),
        })
        .execute();
};

export const setFileRecordData = async (
    identifier: string,
    data: Uint8Array,
): Promise<void> => {
    await db.updateTable("file")
        .set("data", data)
        .set("is_ready", true)
        .where("identifier", "=", identifier)
        .execute();
};

export const fileExistsForUser = async (
    identifier: string,
    user_id: number,
): Promise<boolean> => {
    return (await db.selectFrom("file")
        .select(sql`1`.as("exists"))
        .where("identifier", "=", identifier)
        .where("user_id", "=", user_id)
        .executeTakeFirst()) !== null;
};

export const getFileRecordSize = async (
    identifier: string,
): Promise<number | null> => {
    return (await db.selectFrom("file")
        .select("size")
        .where("identifier", "=", identifier)
        .executeTakeFirst())?.size ?? null;
};

export const deleteFileRecord = async (
    identifier: string,
): Promise<boolean> => {
    const result = await db.deleteFrom("file")
        .where("identifier", "=", identifier)
        .executeTakeFirst();

    return result.numDeletedRows > 0;
};

export type FileMetaRecord = Pick<
    FileTable,
    "identifier" | "name" | "mime_type" | "size" | "is_public" | "created_at"
>;

export interface FindFileFilters {
    name?: string;
}

export const findUserFiles = async (
    filters: FindFileFilters,
    user_id: number,
    page: number,
): Promise<Paged<FileMetaRecord>> => {
    let query = db.selectFrom("file")
        .select([
            "identifier",
            "name",
            "mime_type",
            "size",
            "is_public",
            "created_at",
        ])
        .where("user_id", "=", user_id)
        .where("is_ready", "=", true)
        .orderBy("created_at", "desc");

    query = applyFilters(query, {
        name: { type: "text", value: filters.name },
    });

    return await pageResults(query, page);
};

export const deleteUserFile = async (
    identifier: string,
    user_id: number,
): Promise<boolean> => {
    const result = await db.deleteFrom("file")
        .where("identifier", "=", identifier)
        .where("user_id", "=", user_id)
        .executeTakeFirst();

    return result.numDeletedRows > 0;
};

export type FileWithData = Pick<
    FileTable,
    "name" | "size" | "mime_type" | "data"
>;

export const getFileData = async (
    identifier: string,
    user_id: number,
): Promise<FileWithData | null> => {
    return await db.selectFrom("file")
        .select([
            "name",
            "size",
            "mime_type",
            "data",
        ])
        .where("identifier", "=", identifier)
        .where(({ or, eb }) =>
            or([
                eb("is_public", "=", true),
                eb("user_id", "=", user_id),
            ])
        )
        .executeTakeFirst() ?? null;
};
