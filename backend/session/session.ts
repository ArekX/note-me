import { db } from "$backend/database.ts";
import { SessionState } from "$backend/session/mod.ts";
import { sql } from "../../lib/kysely-sqlite-dialect/deps.ts";

export const loadSessionState = async <T>(
    sessionId: string,
): Promise<SessionState<T> | null> => {
    if (sessionId.length == 0) {
        return null;
    }

    const result = await db.selectFrom("session")
        .select(["data", "user_id"])
        .where("key", "=", sessionId)
        .where("expires_at", ">", (new Date()).getTime())
        .orderBy("expires_at", "desc")
        .limit(1)
        .executeTakeFirst();

    try {
        if (!result) {
            return null;
        }

        const data = result ? JSON.parse(result.data) : null;
        return createSessionStateObject(sessionId, result.user_id, data);
    } catch {
        return null;
    }
};

export const createSessionState = async <T>(
    userId: number,
    data: T,
): Promise<SessionState<T>> => {
    const sessionId = crypto.randomUUID();
    await setSession(sessionId, userId, data);
    return createSessionStateObject(sessionId, userId, data);
};

export const setSession = async <T>(
    sessionId: string,
    userId: number,
    data: T,
): Promise<void> => {
    const existingRow = await db.selectFrom("session")
        .where("key", "=", sessionId)
        .where("expires_at", ">", (new Date()).getTime())
        .select(sql.lit("1").as("one"))
        .executeTakeFirst();

    const dataString = JSON.stringify(data);

    if (existingRow) {
        await db.updateTable("session")
            .set({
                data: dataString,
            })
            .where("key", "=", sessionId)
            .execute();
    } else {
        await db.insertInto("session")
            .values({
                data: dataString,
                key: sessionId,
                user_id: userId,
                expires_at: (new Date()).getTime() +
                    +(Deno.env.get("COOKIE_MAX_AGE_SECONDS") ?? 43200) * 1000,
            })
            .execute();
    }

    await db.deleteFrom("session")
        .where("expires_at", "<", (new Date()).getTime())
        .execute();
};

export const destroySession = async (userId: number) => {
    await db.deleteFrom("session")
        .where("user_id", "=", userId)
        .execute();
};

const createSessionStateObject = <T>(
    sessionId: string,
    userId: number,
    data: T,
): SessionState<T> => {
    return {
        data,
        getId() {
            return sessionId;
        },
        getUserId() {
            return userId;
        },
        async patch(state: Partial<T>) {
            data = { ...data, ...state };
            await setSession(sessionId, userId, data);
        },
        async set(state: T) {
            await setSession(sessionId, userId, state);
            data = state;
        },
    };
};
