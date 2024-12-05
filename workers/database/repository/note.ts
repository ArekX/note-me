import {
    RepositoryHandlerMap,
    RepositoryRequest,
} from "$workers/database/message.ts";
import {
    createNote,
    DeletedNoteRecord,
    DeletedNotesFilter,
    deleteNote,
    deleteUserNotesByParentId,
    findDeletedNotes,
    findRecentlyOpenedNotes,
    fullyDeleteNotes,
    getNote,
    getNoteDetails,
    getNoteInfo,
    getUserNoteCount,
    getUserNoteIds,
    NewNote,
    NoteDetailsOptions,
    NoteDetailsRecord,
    noteExists,
    NoteInfoRecord,
    NoteRecord,
    RecentNoteRecord,
    RemovedNote,
    removeExpiredDeletedNotes,
    restoreDeletedNote,
    updateLastOpenAt,
    UpdateNote,
    updateNote,
    updateNoteParent,
    ViewNoteRecord,
} from "$backend/repository/note-repository.ts";

type NoteRequest<Key extends string, Request, Response> = RepositoryRequest<
    "note",
    Key,
    Request,
    Response
>;

type CreateNote = NoteRequest<"createNote", NewNote, NoteRecord>;
type UpdateNoteMethod = NoteRequest<
    "updateNote",
    { id: number; user_id: number; note: UpdateNote },
    boolean
>;
type DeleteNote = NoteRequest<
    "deleteNote",
    { note_id: number; user_id: number },
    boolean
>;
type GetNote = NoteRequest<
    "getNote",
    { id: number; user_id: number },
    ViewNoteRecord | null
>;
type GetNoteDetails = NoteRequest<
    "getNoteDetails",
    { note_id: number; user_id: number; options: NoteDetailsOptions },
    NoteDetailsRecord | null
>;
type GetNoteInfo = NoteRequest<"getNoteInfo", number, NoteInfoRecord | null>;
type UpdateLastOpenAt = NoteRequest<
    "updateLastOpenAt",
    { note_id: number; user_id: number },
    boolean
>;
type UpdateNoteParent = NoteRequest<
    "updateNoteParent",
    { note_id: number; new_parent_id: number | null; user_id: number },
    boolean
>;
type FindRecentlyOpenedNotes = NoteRequest<
    "findRecentlyOpenedNotes",
    number,
    RecentNoteRecord[]
>;
type FindDeletedNotes = NoteRequest<
    "findDeletedNotes",
    { filters: DeletedNotesFilter; user_id: number },
    DeletedNoteRecord[]
>;
type RemoveExpiredDeletedNotes = NoteRequest<
    "removeExpiredDeletedNotes",
    number,
    RemovedNote[]
>;
type RestoreDeletedNote = NoteRequest<
    "restoreDeletedNote",
    { note_id: number; user_id: number },
    boolean
>;
type GetUserNoteCount = NoteRequest<"getUserNoteCount", number, number>;
type GetUserNoteIds = NoteRequest<
    "getUserNoteIds",
    { parent_id: number; user_id: number },
    number[]
>;
type NoteExists = NoteRequest<
    "noteExists",
    { note_id: number; user_id: number; is_deleted?: boolean },
    boolean
>;
type DeleteUserNotesByParentId = NoteRequest<
    "deleteUserNotesByParentId",
    { parent_id: number; user_id: number },
    number
>;
type FullyDeleteNotes = NoteRequest<"fullyDeleteNotes", number[], void>;

export type NoteRepository =
    | CreateNote
    | UpdateNoteMethod
    | DeleteNote
    | GetNote
    | GetNoteDetails
    | GetNoteInfo
    | UpdateLastOpenAt
    | UpdateNoteParent
    | FindRecentlyOpenedNotes
    | FindDeletedNotes
    | RemoveExpiredDeletedNotes
    | RestoreDeletedNote
    | GetUserNoteCount
    | GetUserNoteIds
    | NoteExists
    | DeleteUserNotesByParentId
    | FullyDeleteNotes;

export const note: RepositoryHandlerMap<NoteRepository> = {
    createNote,
    updateNote: ({ id, user_id, note }) => updateNote(id, user_id, note),
    deleteNote: ({ note_id, user_id }) => deleteNote(note_id, user_id),
    getNote: ({ id, user_id }) => getNote(id, user_id),
    getNoteDetails: ({ note_id, user_id, options }) =>
        getNoteDetails(note_id, user_id, options),
    getNoteInfo,
    updateLastOpenAt: ({ note_id, user_id }) =>
        updateLastOpenAt(note_id, user_id),
    updateNoteParent: ({ note_id, new_parent_id, user_id }) =>
        updateNoteParent(note_id, new_parent_id, user_id),
    findRecentlyOpenedNotes: (user_id) => findRecentlyOpenedNotes(user_id),
    findDeletedNotes: ({ filters, user_id }) =>
        findDeletedNotes(filters, user_id),
    removeExpiredDeletedNotes,
    restoreDeletedNote: ({ note_id, user_id }) =>
        restoreDeletedNote(note_id, user_id),
    getUserNoteCount: (user_id) => getUserNoteCount(user_id),
    getUserNoteIds: ({ parent_id, user_id }) =>
        getUserNoteIds(parent_id, user_id),
    noteExists: ({ note_id, user_id, is_deleted }) =>
        noteExists(note_id, user_id, is_deleted),
    deleteUserNotesByParentId: ({ parent_id, user_id }) =>
        deleteUserNotesByParentId(parent_id, user_id),
    fullyDeleteNotes,
};
