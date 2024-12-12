import { DbHandlerMap, DbRequest } from "$workers/database/message.ts";
import {
    NoteSearchRecord,
    searchDeletedNotes,
    searchGeneral,
    SearchNoteFilters,
    searchReminderNotes,
    searchSharedNotes,
} from "../query/note-search-repository.ts";
import { DeletedNoteRecord } from "../query/note-repository.ts";
import { ReminderNoteRecord } from "../query/note-reminder-repository.ts";
import { UserSharedNoteMeta } from "../query/note-share-repository.ts";

type NoteSearchRequest<Key extends string, Request, Response> = DbRequest<
    "noteSearch",
    "repository",
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

export const noteSearch: DbHandlerMap<NoteSearchRepository> = {
    searchGeneral: ({ filters, user_id }) => searchGeneral(filters, user_id),
    searchDeletedNotes: ({ filters, user_id }) =>
        searchDeletedNotes(filters, user_id),
    searchReminderNotes: ({ filters, user_id }) =>
        searchReminderNotes(filters, user_id),
    searchSharedNotes: ({ filters, user_id }) =>
        searchSharedNotes(filters, user_id),
};
