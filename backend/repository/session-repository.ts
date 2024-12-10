import { SessionTable } from "$types";
import { db } from "$backend/database.ts";
import { sql } from "$lib/kysely-sqlite-dialect/deps.ts";

interface SessionData {
    data: unknown;
}

export type TypedSession<T> = Pick<SessionTable, "key" | "user_id"> & {
    data: T;
};

const toTypedSession = <T>(
    record: Pick<SessionTable, "key" | "user_id" | "data"> | null,
) => {
    if (!record) {
        return null;
    }

    try {
        return {
            ...record,
            data: JSON.parse(record.data) as T,
        } as TypedSession<T>;
    } catch {
        return null;
    }
};

export const getSessionByKey = async <T>(
    key: string,
): Promise<TypedSession<T> | null> => {
    const record = await db.selectFrom("session")
        .select(["key", "data", "user_id"])
        .where("key", "=", key)
        .where("expires_at", ">", (new Date()).getTime())
        .orderBy("expires_at", "desc")
        .limit(1)
        .executeTakeFirst() ?? null;

    return toTypedSession(record);
};

export const sessionExists = async (key: string): Promise<boolean> => {
    return !!(await db.selectFrom("session")
        .where("key", "=", key)
        .where("expires_at", ">", (new Date()).getTime())
        .select(sql.lit("1").as("one"))
        .executeTakeFirst() ?? null);
};

export const getSessionByUserId = async <T>(
    userId: number,
): Promise<TypedSession<T> | null> => {
    const record = await db.selectFrom("session")
        .select(["key", "data", "user_id"])
        .where("user_id", "=", userId)
        .where("expires_at", ">", (new Date()).getTime())
        .orderBy("expires_at", "desc")
        .limit(1)
        .executeTakeFirst() ?? null;

    return toTypedSession(record);
};

export const deleteSessionByUserId = async (userId: number) => {
    await db.deleteFrom("session")
        .where("user_id", "=", userId)
        .execute();
};

export const deleteExpiredSessions = async () => {
    await db.deleteFrom("session")
        .where("expires_at", "<", (new Date()).getTime())
        .execute();
};

export const updateSessionData = async (key: string, data: unknown) => {
    await db.updateTable("session")
        .set({
            data: JSON.stringify(data),
        })
        .where("key", "=", key)
        .execute();
};

export type NewSessionRecord =
    & Pick<SessionTable, "key" | "user_id" | "expires_at">
    & SessionData;

export const createNewSession = async (record: NewSessionRecord) => {
    const insertRecord = {
        key: record.key,
        user_id: record.user_id,
        expires_at: record.expires_at,
        data: JSON.stringify(record.data),
    };

    const result = await db.insertInto("session")
        .values(insertRecord)
        .returning("id")
        .executeTakeFirst();

    return result?.id;
};
