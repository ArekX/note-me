import { SessionState } from "$backend/session/mod.ts";
import { repository, TypedSession } from "$db";

export const loadSessionState = async <T>(
    sessionId: string,
): Promise<SessionState<T> | null> => {
    if (sessionId.length == 0) {
        return null;
    }

    const result = await repository.session.getSessionByKey(sessionId) as
        | TypedSession<T>
        | null;

    return toSessionObject(result);
};

export const loadSessionStateByUserId = async <T>(
    userId: number,
): Promise<SessionState<T> | null> => {
    const result = await repository.session.getSessionByUserId(userId) as
        | TypedSession<T>
        | null;

    return toSessionObject(result);
};

const toSessionObject = <T>(
    result: { key: string; data: T; user_id: number } | null,
): SessionState<T> | null => {
    if (!result) {
        return null;
    }

    return createSessionStateObject(
        result.key,
        result.user_id,
        result.data,
    );
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
    const existingRow = await repository.session.sessionExists(sessionId);

    if (existingRow) {
        await repository.session.updateSessionData({
            key: sessionId,
            data,
        });
    } else {
        await repository.session.createNewSession({
            data,
            key: sessionId,
            user_id: userId,
            expires_at: (new Date()).getTime() +
                +(Deno.env.get("COOKIE_MAX_AGE_SECONDS") ?? 43200) * 1000,
        });
    }

    await repository.session.deleteExpiredSessions();
};

export const destroySession = async (userId: number) => {
    await repository.session.deleteSessionByUserId(userId);
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
