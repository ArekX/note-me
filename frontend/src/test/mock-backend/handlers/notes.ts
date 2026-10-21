import type {
    CreateNoteResponse,
    DeleteHistoryRecordResponse,
    DeleteNoteResponse,
    FindDeletedNotesResponse,
    FindNoteHistoryResponse,
    FullyDeleteNoteResponse,
    GetNoteDetailsResponse,
    GetNoteResponse,
    GetSharedNoteResponse,
    GetNoteHistoryDataResponse,
    GetRecentlyOpenedNotesResponse,
    NoteFrontendMessage,
    RestoreDeletedNoteResponse,
    RevertNoteToHistoryResponse,
    SearchNoteResponse,
    UpdateNoteResponse,
} from "@/types/messages";
import type {
    NoteSearchResult,
    ReminderNoteRecord,
    UserSharedNoteMeta,
} from "@/types/records";
import { contains, nextId, paged, type MockHandlerMap } from "../handler";
import { now, type MockNote } from "../state";
import {
    addHistory,
    groupName,
    normalizeTags,
    ownGroup,
    ownNote,
    toDeletedRecord,
    toReminderRecord,
    toSharedMeta,
    userName,
} from "./note-helpers";
import { noteReminderHandlers, noteSharingHandlers } from "./note-sharing";

export const notesHandlers: MockHandlerMap<NoteFrontendMessage> = {
    ...noteSharingHandlers,
    ...noteReminderHandlers,
    createNote: ({ data }, { state, respond, fail }) => {
        if (data.group_id !== null && !ownGroup(state, data.group_id)) {
            return fail("Group does not exist!");
        }
        const t = now();
        const note: MockNote = {
            id: nextId(state),
            title: data.title,
            note: data.text,
            is_encrypted: data.is_encrypted,
            is_wide: data.is_wide ?? false,
            user_id: state.currentUser.id,
            group_id: data.group_id,
            tags: normalizeTags(state, data.tags),
            created_at: t,
            updated_at: t,
            last_open_at: null,
            is_deleted: false,
            deleted_at: null,
        };
        state.notes.push(note);
        respond<CreateNoteResponse>("createNoteResponse", {
            record: {
                id: note.id,
                title: note.title,
                note: note.note,
                is_encrypted: note.is_encrypted,
                is_wide: note.is_wide ?? true,
                user_id: note.user_id,
                created_at: note.created_at,
                updated_at: note.updated_at,
                last_open_at: note.last_open_at,
            },
            group_id: note.group_id,
        });
    },
    getNote: ({ id, mark_opened }, { state, respond, fail }) => {
        const note = ownNote(state, id);
        if (!note || note.is_deleted) {
            return fail("Requested note not found.");
        }
        if (mark_opened) {
            note.last_open_at = now();
        }
        respond<GetNoteResponse>("getNoteResponse", {
            record: {
                id: note.id,
                title: note.title,
                note: note.note,
                is_encrypted: note.is_encrypted,
                is_wide: note.is_wide ?? true,
                group_id: note.group_id,
                group_name: groupName(state, note.group_id),
                tags: note.tags,
                updated_at: note.updated_at,
            },
        });
    },
    getNoteDetails: ({ id, options }, { state, respond, fail }) => {
        const note = state.notes.find(
            (n) =>
                n.id === id &&
                (n.is_deleted
                    ? options.include_deleted &&
                      n.user_id === state.currentUser.id
                    : n.user_id === state.currentUser.id ||
                      state.userShares.some(
                          (s) =>
                              s.note_id === id &&
                              s.user_id === state.currentUser.id,
                      )),
        );
        if (!note) {
            return fail("Note does not exist.");
        }
        const own = note.user_id === state.currentUser.id;
        respond<GetNoteDetailsResponse>("getNoteDetailsResponse", {
            record: {
                group_id: options.include_group
                    ? own
                        ? note.group_id
                        : null
                    : 0,
                group_name: options.include_group
                    ? own
                        ? groupName(state, note.group_id)
                        : null
                    : "",
                created_at: options.include_timestamp ? note.created_at : 0,
                updated_at: options.include_timestamp ? note.updated_at : 0,
                user_name: options.include_user
                    ? userName(state, note.user_id)
                    : "",
                is_encrypted: note.is_encrypted,
                note: options.include_note ? note.note : "",
                title: options.include_title ? note.title : "",
                is_deleted: note.is_deleted,
            },
        });
    },
    updateNote: ({ id, data }, { state, respond, fail }) => {
        const note = ownNote(state, id);
        if (!note || note.is_deleted) {
            return fail("Note does not exist.");
        }
        if (
            data.group_id !== undefined &&
            data.group_id !== null &&
            !ownGroup(state, data.group_id)
        ) {
            return fail("Group does not exist!");
        }
        if (Object.keys(data).some((key) => key !== "is_wide")) {
            addHistory(state, note);
        }
        if (data.is_wide !== undefined) note.is_wide = data.is_wide;
        if (data.title !== undefined) note.title = data.title;
        if (data.text !== undefined) note.note = data.text;
        if (data.is_encrypted !== undefined)
            note.is_encrypted = data.is_encrypted;
        if (data.tags !== undefined)
            note.tags = normalizeTags(state, data.tags);
        if (data.group_id !== undefined) note.group_id = data.group_id;
        if (
            data.title !== undefined ||
            data.text !== undefined ||
            data.is_encrypted !== undefined
        ) {
            note.updated_at = now();
        }
        respond<UpdateNoteResponse>("updateNoteResponse", {
            updated_id: id,
            updated_data: data,
        });
    },
    deleteNote: ({ id }, { state, respond, fail }) => {
        const note = ownNote(state, id);
        if (!note || note.is_deleted) {
            return fail("Note does not exist.");
        }
        state.reminders = state.reminders.filter(
            (r) => !(r.note_id === id && r.user_id === state.currentUser.id),
        );
        note.is_deleted = true;
        note.deleted_at = now();
        respond<DeleteNoteResponse>("deleteNoteResponse", { deleted_id: id });
    },
    findNoteHistory: ({ note_id, page }, { state, respond, fail }) => {
        if (!ownNote(state, note_id) || ownNote(state, note_id)!.is_deleted) {
            return fail("Note does not exist.");
        }
        respond<FindNoteHistoryResponse>("findNoteHistoryResponse", {
            records: paged(
                state.history
                    .filter((h) => h.note_id === note_id)
                    .sort((a, b) => b.created_at - a.created_at || b.id - a.id)
                    .map(({ id, version, created_at, is_encrypted }) => ({
                        id,
                        version,
                        created_at,
                        is_encrypted,
                    })),
                page,
            ),
        });
    },
    getNoteHistoryData: ({ id }, { state, respond, fail }) => {
        const record = state.history.find(
            (h) => h.id === id && ownNote(state, h.note_id),
        );
        if (!record) {
            return fail("Note history data does not exist.");
        }
        const { version, note, title, is_encrypted, tags } = record;
        respond<GetNoteHistoryDataResponse>("getNoteHistoryDataResponse", {
            data: { version, note, title, is_encrypted, tags },
        });
    },
    revertNoteToHistory: (
        { note_id, to_history_id },
        { state, respond, fail },
    ) => {
        const note = ownNote(state, note_id);
        if (!note || note.is_deleted) {
            return fail("Note does not exist.");
        }
        const record = state.history.find(
            (h) => h.id === to_history_id && h.note_id === note_id,
        );
        if (!record) {
            return fail("Note history data does not exist.");
        }
        addHistory(state, note, true);
        note.title = record.title;
        note.note = record.note;
        note.is_encrypted = record.is_encrypted;
        note.tags = record.tags ? record.tags.split(",") : [];
        note.updated_at = now();
        respond<RevertNoteToHistoryResponse>("revertNoteToHistoryResponse", {
            note_id,
            is_encrypted: note.is_encrypted,
            title: note.title,
            note: note.note,
            tags: note.tags,
        });
    },
    deleteHistoryRecord: ({ id, note_id }, { state, respond, fail }) => {
        if (!ownNote(state, note_id) || ownNote(state, note_id)!.is_deleted) {
            return fail("Note does not exist.");
        }
        state.history = state.history.filter(
            (h) => !(h.id === id && h.note_id === note_id),
        );
        respond<DeleteHistoryRecordResponse>("deleteHistoryRecordResponse", {
            id,
        });
    },
    getSharedNote: ({ id }, { state, respond, fail }) => {
        const shared = state.userShares.some(
            (s) => s.note_id === id && s.user_id === state.currentUser.id,
        );
        const note = state.notes.find((n) => n.id === id && !n.is_deleted);
        if (!shared || !note) {
            return fail("Requested note not found.");
        }
        if (note.is_encrypted) {
            return fail(
                "This note is protected by its owner and cannot be viewed.",
            );
        }
        respond<GetSharedNoteResponse>("getSharedNoteResponse", {
            record: {
                id: note.id,
                title: note.title,
                note: note.note,
                is_encrypted: false,
                is_wide: note.is_wide ?? true,
                tags: note.tags,
                updated_at: note.updated_at,
                user_name: userName(state, note.user_id),
            },
        });
    },
    searchNote: ({ filters }, { state, respond }) => {
        const groupIds = new Set<number>();
        if (filters.group_id !== undefined) {
            groupIds.add(filters.group_id);
            for (const id of groupIds) {
                for (const g of state.groups) {
                    if (g.parent_id === id) {
                        groupIds.add(g.id);
                    }
                }
            }
        }
        const matches = (n: MockNote) =>
            (contains(n.title, filters.query) ||
                (!n.is_encrypted && contains(n.note, filters.query))) &&
            (filters.group_id === undefined ||
                (n.group_id !== null && groupIds.has(n.group_id))) &&
            (!filters.tags?.length ||
                filters.tags.some((t) => n.tags.includes(t)));

        let results: NoteSearchResult[];
        switch (filters.type) {
            case "recycleBin":
                results = state.notes
                    .filter((n) => n.is_deleted && matches(n))
                    .map(toDeletedRecord);
                break;
            case "reminders":
                results = state.reminders
                    .filter((r) => r.user_id === state.currentUser.id)
                    .map((r) => toReminderRecord(state, r))
                    .filter(
                        (r): r is ReminderNoteRecord =>
                            r !== null && contains(r.title, filters.query),
                    );
                break;
            case "shared":
                results = state.userShares
                    .map((s) => toSharedMeta(state, s))
                    .filter(
                        (r): r is UserSharedNoteMeta =>
                            r !== null && contains(r.title, filters.query),
                    );
                break;
            default:
                results = state.notes
                    .filter(
                        (n) =>
                            n.user_id === state.currentUser.id &&
                            !n.is_deleted &&
                            n.id > (filters.from_id ?? 0) &&
                            matches(n),
                    )
                    .sort((a, b) => a.id - b.id)
                    .slice(0, 10)
                    .map((n) => ({
                        id: n.id,
                        title: n.title,
                        note: n.note,
                        group_name: groupName(state, n.group_id),
                        is_encrypted: n.is_encrypted,
                        updated_at: n.updated_at,
                        user_name: userName(state, n.user_id),
                    }));
        }
        respond<SearchNoteResponse>("searchNoteResponse", { results });
    },
    getRecentlyOpenedNotes: (_m, { state, respond }) =>
        respond<GetRecentlyOpenedNotesResponse>(
            "getRecentlyOpenedNotesResponse",
            {
                records: state.notes
                    .filter(
                        (n) =>
                            n.user_id === state.currentUser.id && !n.is_deleted,
                    )
                    .sort(
                        (a, b) => (b.last_open_at ?? 0) - (a.last_open_at ?? 0),
                    )
                    .slice(0, 5)
                    .map((n) => ({
                        id: n.id,
                        title: n.title,
                        group_id: n.group_id,
                        group_name: groupName(state, n.group_id),
                        updated_at: n.updated_at,
                        last_open_at: n.last_open_at,
                        is_encrypted: n.is_encrypted,
                    })),
            },
        ),
    findDeletedNotes: ({ filters }, { state, respond }) =>
        respond<FindDeletedNotesResponse>("findDeletedNotesResponse", {
            records: state.notes
                .filter(
                    (n) =>
                        n.is_deleted &&
                        n.user_id === state.currentUser.id &&
                        n.id > (filters.fromId ?? 0),
                )
                .sort((a, b) => a.id - b.id)
                .slice(0, 10)
                .map(toDeletedRecord),
        }),
    restoreDeletedNote: ({ id }, { state, respond }) => {
        const note = ownNote(state, id);
        if (!note?.is_deleted) {
            return respond<RestoreDeletedNoteResponse>(
                "restoreDeletedNoteResponse",
                { restored_note: null },
            );
        }
        note.is_deleted = false;
        note.deleted_at = null;
        note.group_id = null;
        respond<RestoreDeletedNoteResponse>("restoreDeletedNoteResponse", {
            restored_note: {
                id: note.id,
                title: note.title,
                note: note.note,
                is_encrypted: note.is_encrypted,
                is_wide: note.is_wide ?? true,
                group_id: null,
                group_name: null,
                tags: note.tags,
                updated_at: note.updated_at,
            },
        });
    },
    fullyDeleteNote: ({ id }, { state, respond, fail }) => {
        if (!ownNote(state, id)?.is_deleted) {
            return fail("Note does not exist.");
        }
        state.notes = state.notes.filter((n) => n.id !== id);
        respond<FullyDeleteNoteResponse>("fullyDeleteNoteResponse", {
            deleted_id: id,
        });
    },
};
