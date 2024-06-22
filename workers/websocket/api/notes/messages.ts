import { Message } from "$workers/websocket/types.ts";
import { AddNoteRequest, UpdateNoteRequest } from "$schemas/notes.ts";
import {
    NoteDetailsRecord,
    NoteRecord,
    ViewNoteRecord,
} from "$backend/repository/note-repository.ts";
import { Paged } from "$lib/kysely-sqlite-dialect/pagination.ts";
import {
    NoteHistoryDataRecord,
    NoteHistoryMetaRecord,
} from "$backend/repository/note-history-repository.ts";

type NoteMessage<Type, Data = unknown> = Message<
    "notes",
    Type,
    Data
>;

export type CreateNoteMessage = NoteMessage<
    "createNote",
    { data: AddNoteRequest }
>;

export type CreateNoteResponse = NoteMessage<
    "createNoteResponse",
    { record: NoteRecord; group_id: number | null }
>;

export type GetNoteMessage = NoteMessage<
    "getNote",
    { id: number }
>;

export type GetNoteResponse = NoteMessage<
    "getNoteResponse",
    { record: ViewNoteRecord }
>;

export type GetNoteDetailsMessage = NoteMessage<
    "getNoteDetails",
    { id: number }
>;

export type GetNoteDetailsResponse = NoteMessage<
    "getNoteDetailsResponse",
    { record: NoteDetailsRecord }
>;

export type UpdateNoteMessage = NoteMessage<
    "updateNote",
    { id: number; data: UpdateNoteRequest }
>;

export type UpdateNoteResponse = NoteMessage<
    "updateNoteResponse",
    { updated_id: number; updated_data: UpdateNoteRequest }
>;

export type DeleteNoteMessage = NoteMessage<
    "deleteNote",
    { id: number }
>;

export type DeleteNoteResponse = NoteMessage<
    "deleteNoteResponse",
    { deleted_id: number }
>;

export type FindNoteHistoryMessage = NoteMessage<
    "findNoteHistory",
    { note_id: number; page: number }
>;

export type FindNoteHistoryResponse = NoteMessage<
    "findNoteHistoryResponse",
    { records: Paged<NoteHistoryMetaRecord> }
>;

export type GetNoteHistoryDataMessage = NoteMessage<
    "getNoteHistoryData",
    { id: number }
>;

export type GetNoteHistoryDataResponse = NoteMessage<
    "getNoteHistoryDataResponse",
    { data: NoteHistoryDataRecord }
>;

export type RevertNoteToHistoryMessage = NoteMessage<
    "revertNoteToHistory",
    { note_id: number; to_history_id: number }
>;

export type RevertNoteToHistoryResponse = NoteMessage<
    "revertNoteToHistoryResponse",
    { note_id: number; title: string; note: string; tags: string[] }
>;

export type DeleteHistoryRecordMessage = NoteMessage<
    "deleteHistoryRecord",
    { id: number; note_id: number }
>;

export type DeleteHistoryRecordResponse = NoteMessage<
    "deleteHistoryRecordResponse",
    { id: number }
>;

export type NoteFrontendResponse =
    | CreateNoteResponse
    | UpdateNoteResponse
    | DeleteNoteResponse
    | FindNoteHistoryResponse
    | GetNoteHistoryDataResponse
    | RevertNoteToHistoryResponse
    | DeleteHistoryRecordResponse
    | GetNoteResponse
    | GetNoteDetailsResponse;

export type NoteFrontendMessage =
    | CreateNoteMessage
    | UpdateNoteMessage
    | DeleteNoteMessage
    | FindNoteHistoryMessage
    | GetNoteHistoryDataMessage
    | RevertNoteToHistoryMessage
    | DeleteHistoryRecordMessage
    | GetNoteMessage
    | GetNoteDetailsMessage;
