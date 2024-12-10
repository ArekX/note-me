import {
    RepositoryHandlerMap,
    RepositoryRequest,
} from "$workers/database/message.ts";
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
} from "$backend/repository/session-repository.ts";

type SessionRequest<Key extends string, Request, Response> = RepositoryRequest<
    "session",
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

export const session: RepositoryHandlerMap<SessionRepository> = {
    getSessionByKey,
    sessionExists,
    getSessionByUserId,
    deleteSessionByUserId,
    deleteExpiredSessions,
    updateSessionData: ({ key, data }) => updateSessionData(key, data),
    createNewSession,
};
