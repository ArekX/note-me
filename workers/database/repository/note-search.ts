import {
    RepositoryHandlerMap,
    RepositoryRequest,
} from "$workers/database/message.ts";
import {
    NoteSearchRecord,
    searchDeletedNotes,
    searchGeneral,
    SearchNoteFilters,
    searchReminderNotes,
    searchSharedNotes,
} from "$backend/repository/note-search-repository.ts";
import { DeletedNoteRecord } from "$backend/repository/note-repository.ts";
import { ReminderNoteRecord } from "$backend/repository/note-reminder-repository.ts";
import { UserSharedNoteMeta } from "$backend/repository/note-share-repository.ts";

type NoteSearchRequest<Key extends string, Request, Response> =
    RepositoryRequest<
        "noteSearch",
        Key,
        Request,
        Response
    >;

type SearchGeneral = NoteSearchRequest<"searchGeneral", {
    filters: SearchNoteFilters;
    user_id: number;
}, NoteSearchRecord[]>;
type SearchDeletedNotes = NoteSearchRequest<"searchDeletedNotes", {
    filters: SearchNoteFilters;
    user_id: number;
}, DeletedNoteRecord[]>;
type SearchReminderNotes = NoteSearchRequest<"searchReminderNotes", {
    filters: SearchNoteFilters;
    user_id: number;
}, ReminderNoteRecord[]>;
type SearchSharedNotes = NoteSearchRequest<"searchSharedNotes", {
    filters: SearchNoteFilters;
    user_id: number;
}, UserSharedNoteMeta[]>;

export type NoteSearchRepository =
    | SearchGeneral
    | SearchDeletedNotes
    | SearchReminderNotes
    | SearchSharedNotes;

export const noteSearch: RepositoryHandlerMap<NoteSearchRepository> = {
    searchGeneral: ({ filters, user_id }) => searchGeneral(filters, user_id),
    searchDeletedNotes: ({ filters, user_id }) =>
        searchDeletedNotes(filters, user_id),
    searchReminderNotes: ({ filters, user_id }) =>
        searchReminderNotes(filters, user_id),
    searchSharedNotes: ({ filters, user_id }) =>
        searchSharedNotes(filters, user_id),
};
