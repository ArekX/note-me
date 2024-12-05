import {
    RepositoryHandlerMap,
    RepositoryRequest,
} from "$workers/database/message.ts";
import {
    findUserReminderNotes,
    getNoteReminderData,
    getReadyReminders,
    NoteReminderData,
    ReadyReminder,
    ReminderNoteRecord,
    removeReminder,
    resolveReminderNextOcurrence,
    setReminder,
    SetReminderData,
    SetReminderResult,
    UserReminderNotesFilters,
} from "$backend/repository/note-reminder-repository.ts";

type NoteReminderRequest<Key extends string, Request, Response> =
    RepositoryRequest<
        "noteReminder",
        Key,
        Request,
        Response
    >;

type SetReminder = NoteReminderRequest<
    "setReminder",
    SetReminderData,
    SetReminderResult
>;
type RemoveReminder = NoteReminderRequest<
    "removeReminder",
    { note_id: number; user_id: number },
    void
>;
type FindUserReminderNotes = NoteReminderRequest<
    "findUserReminderNotes",
    { filters: UserReminderNotesFilters; user_id: number },
    ReminderNoteRecord[]
>;
type GetNoteReminderData = NoteReminderRequest<
    "getNoteReminderData",
    { note_id: number; user_id: number },
    NoteReminderData | null
>;
type GetReadyReminders = NoteReminderRequest<
    "getReadyReminders",
    void,
    ReadyReminder[]
>;
type ResolveReminderNextOcurrence = NoteReminderRequest<
    "resolveReminderNextOcurrence",
    number,
    void
>;

export type NoteReminderRepository =
    | SetReminder
    | RemoveReminder
    | FindUserReminderNotes
    | GetNoteReminderData
    | GetReadyReminders
    | ResolveReminderNextOcurrence;

export const noteReminder: RepositoryHandlerMap<NoteReminderRepository> = {
    setReminder,
    removeReminder: ({ note_id, user_id }) => removeReminder(note_id, user_id),
    findUserReminderNotes: ({ filters, user_id }) =>
        findUserReminderNotes(filters, user_id),
    getNoteReminderData: ({ note_id, user_id }) =>
        getNoteReminderData(note_id, user_id),
    getReadyReminders,
    resolveReminderNextOcurrence: (id) => resolveReminderNextOcurrence(id),
};
