import { FileTable } from "../../types/tables.ts";
import { db } from "$backend/database.ts";

export type NewFileRecord = Pick<
    FileTable,
    "identifier" | "name" | "user_id" | "mime_type" | "size"
>;

export const createFile = async (data: NewFileRecord): Promise<void> => {
    await db.insertInto("file")
        .values({
            ...data,
            created_at: Date.now(),
        })
        .execute();
};

export const setFileData = async (
    identifier: string,
    data: Uint8Array,
): Promise<void> => {
    await db.updateTable("file")
        .set("data", data)
        .set("is_ready", true)
        .where("identifier", "=", identifier)
        .execute();
};
