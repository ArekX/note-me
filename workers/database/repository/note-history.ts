import {
    addHistory,
    AddHistoryData,
    deleteHistoryRecord,
    findHistory,
    getHistoryRecordData,
    NoteHistoryDataRecord,
    NoteHistoryMetaRecord,
} from "$backend/repository/note-history-repository.ts";
import {
    RepositoryHandlerMap,
    RepositoryRequest,
} from "$workers/database/message.ts";
import { Paged } from "$lib/kysely-sqlite-dialect/pagination.ts";

type NoteHistoryRequest<Key extends string, Request, Response> =
    RepositoryRequest<
        "noteHistory",
        Key,
        Request,
        Response
    >;

type AddHistory = NoteHistoryRequest<"addHistory", AddHistoryData, void>;
type DeleteHistoryRecord = NoteHistoryRequest<
    "deleteHistoryRecord",
    { id: number; note_id: number },
    void
>;
type FindHistory = NoteHistoryRequest<
    "findHistory",
    { note_id: number; user_id: number; page: number },
    Paged<NoteHistoryMetaRecord>
>;
type GetHistoryRecordData = NoteHistoryRequest<
    "getHistoryRecordData",
    { id: number; user_id: number },
    NoteHistoryDataRecord | null
>;

export type NoteHistoryRepository =
    | AddHistory
    | DeleteHistoryRecord
    | FindHistory
    | GetHistoryRecordData;

export const noteHistory: RepositoryHandlerMap<NoteHistoryRepository> = {
    addHistory,
    deleteHistoryRecord: ({ id, note_id }) => deleteHistoryRecord(id, note_id),
    findHistory: ({ note_id, user_id, page }) =>
        findHistory(note_id, user_id, page),
    getHistoryRecordData: ({ id, user_id }) =>
        getHistoryRecordData(id, user_id),
};
