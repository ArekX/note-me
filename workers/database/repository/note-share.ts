import { DbHandlerMap, DbRequest } from "$workers/database/message.ts";
import {
    createPublicShare,
    findUserSharedNotes,
    FindUserSharedNotesFilters,
    getNoteShareData,
    getPublicShareNote,
    getUserShareNote,
    PublicNoteShareRecord,
    PublicSharedNote,
    removeExpiredPublicShares,
    removePublicShare,
    setUserShare,
    sharedNoteWithUser,
    UserSharedNoteMeta,
} from "../query/note-share-repository.ts";
import { PickUserRecord } from "../query/user-repository.ts";

type NoteShareRequest<Key extends string, Request, Response> = DbRequest<
    "noteShare",
    "repository",
    Key,
    Request,
    Response
>;

type GetPublicShareNote = NoteShareRequest<
    "getPublicShareNote",
    string,
    PublicSharedNote | null
>;
type GetUserShareNote = NoteShareRequest<
    "getUserShareNote",
    { note_id: number; user_id: number },
    PublicSharedNote | null
>;
type CreatePublicShare = NoteShareRequest<
    "createPublicShare",
    { note_id: number; expires_at: number | null },
    PublicNoteShareRecord
>;
type RemovePublicShare = NoteShareRequest<"removePublicShare", number, void>;
type SetUserShare = NoteShareRequest<
    "setUserShare",
    { note_id: number; user_ids: number[] },
    { shared_to_user_ids: number[] }
>;
type GetNoteShareData = NoteShareRequest<
    "getNoteShareData",
    number,
    { users: PickUserRecord[]; links: PublicNoteShareRecord[] }
>;
type FindUserSharedNotes = NoteShareRequest<
    "findUserSharedNotes",
    { filters: FindUserSharedNotesFilters; user_id: number },
    UserSharedNoteMeta[]
>;
type RemoveExpiredPublicShares = NoteShareRequest<
    "removeExpiredPublicShares",
    void,
    void
>;
type SharedNoteWithUser = NoteShareRequest<
    "sharedNoteWithUser",
    { note_id: number; user_id: number },
    boolean
>;

export type NoteShareRepository =
    | GetPublicShareNote
    | GetUserShareNote
    | CreatePublicShare
    | RemovePublicShare
    | SetUserShare
    | GetNoteShareData
    | FindUserSharedNotes
    | RemoveExpiredPublicShares
    | SharedNoteWithUser;

export const noteShare: DbHandlerMap<NoteShareRepository> = {
    getPublicShareNote,
    getUserShareNote: ({ note_id, user_id }) =>
        getUserShareNote(note_id, user_id),
    createPublicShare: ({ note_id, expires_at }) =>
        createPublicShare({ note_id, expires_at }),
    removePublicShare,
    setUserShare: ({ note_id, user_ids }) =>
        setUserShare({ note_id, user_ids }),
    getNoteShareData,
    findUserSharedNotes: ({ filters, user_id }) =>
        findUserSharedNotes(filters, user_id),
    removeExpiredPublicShares,
    sharedNoteWithUser: ({ note_id, user_id }) =>
        sharedNoteWithUser(note_id, user_id),
};
