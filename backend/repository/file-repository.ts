import { FileTable } from "../../types/tables.ts";
import { db } from "$backend/database.ts";

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
