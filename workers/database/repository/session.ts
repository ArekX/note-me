import { DbHandlerMap, DbRequest } from "$workers/database/message.ts";
import {
    createNewSession,
    deleteExpiredSessions,
    deleteSessionByUserId,
    getSessionByKey,
    getSessionByUserId,
    NewSessionRecord,
    sessionExists,
    TypedSession,
    updateSessionData,
} from "../query/session-repository.ts";

type SessionRequest<Key extends string, Request, Response> = DbRequest<
    "session",
    "repository",
    Key,
    Request,
    Response
>;

type GetSessionByKey<T = unknown> = SessionRequest<
    "getSessionByKey",
    string,
    TypedSession<T> | null
>;
type SessionExists = SessionRequest<"sessionExists", string, boolean>;
type GetSessionByUserId<T = unknown> = SessionRequest<
    "getSessionByUserId",
    number,
    TypedSession<T> | null
>;
type DeleteSessionByUserId = SessionRequest<
    "deleteSessionByUserId",
    number,
    void
>;
type DeleteExpiredSessions = SessionRequest<
    "deleteExpiredSessions",
    void,
    void
>;
type UpdateSessionData = SessionRequest<
    "updateSessionData",
    { key: string; data: unknown },
    void
>;
type CreateNewSession = SessionRequest<
    "createNewSession",
    NewSessionRecord,
    number | undefined
>;

export type SessionRepository =
    | GetSessionByKey
    | SessionExists
    | GetSessionByUserId
    | DeleteSessionByUserId
    | DeleteExpiredSessions
    | UpdateSessionData
    | CreateNewSession;

export const session: DbHandlerMap<SessionRepository> = {
    getSessionByKey,
    sessionExists,
    getSessionByUserId,
    deleteSessionByUserId,
    deleteExpiredSessions,
    updateSessionData: ({ key, data }) => updateSessionData(key, data),
    createNewSession,
};
