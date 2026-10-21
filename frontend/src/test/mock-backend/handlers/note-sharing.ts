import type {
    CreatePublicShareResponse,
    FindNoteRemindersResponse,
    FindSharedNotesResponse,
    GetNoteReminderDataResponse,
    GetNoteShareDataResponse,
    NoteFrontendMessage,
    RemovePublicShareResponse,
    RemoveReminderResponse,
    SetReminderResponse,
    ShareToUsersResponse,
} from "@/types/messages";
import { nextId, type MockHandlerMap } from "../handler";
import { now } from "../state";
import { ownNote, toReminderRecord, toSharedMeta } from "./note-helpers";
import type { MockState } from "../state";

// Same text as the server's.
const PROTECTED_ERROR = "Protected notes cannot be shared.";

const isProtected = (state: MockState, noteId: number) =>
    state.notes.some((n) => n.id === noteId && n.is_encrypted);

type NoteHandlers = MockHandlerMap<NoteFrontendMessage>;

export const noteSharingHandlers: Pick<
    NoteHandlers,
    | "getNoteShareData"
    | "createPublicShare"
    | "removePublicShare"
    | "shareToUsers"
    | "findSharedNotes"
> = {
    getNoteShareData: ({ note_id }, { state, respond }) =>
        respond<GetNoteShareDataResponse>("getNoteShareDataResponse", {
            users: state.userShares
                .filter((s) => s.note_id === note_id)
                .map((s) => state.users.find((u) => u.id === s.user_id))
                .filter((u) => u !== undefined)
                .map(({ id, name, username }) => ({ id, name, username })),
            links: state.linkShares.filter((l) => l.note_id === note_id),
        }),
    createPublicShare: ({ note_id, expires_at }, { state, respond, fail }) => {
        if (isProtected(state, note_id)) {
            return fail(PROTECTED_ERROR);
        }
        const record = {
            id: nextId(state),
            note_id,
            identifier: `mock-share-${state.nextId}`,
            created_at: now(),
            expires_at,
        };
        state.linkShares.push(record);
        respond<CreatePublicShareResponse>("createPublicShareResponse", {
            record,
        });
    },
    removePublicShare: ({ id }, { state, respond }) => {
        state.linkShares = state.linkShares.filter((l) => l.id !== id);
        respond<RemovePublicShareResponse>("removePublicShareResponse", {
            removed_id: id,
        });
    },
    shareToUsers: ({ note_id, user_ids }, { state, respond, fail }) => {
        if (!ownNote(state, note_id)) {
            return fail("Note does not exist.");
        }
        if (isProtected(state, note_id)) {
            return fail(PROTECTED_ERROR);
        }
        state.userShares = state.userShares.filter(
            (s) => s.note_id !== note_id,
        );
        for (const user_id of user_ids) {
            state.userShares.push({
                id: nextId(state),
                note_id,
                user_id,
                created_at: now(),
            });
        }
        respond<ShareToUsersResponse>("shareToUsersResponse");
    },
    findSharedNotes: ({ filters }, { state, respond }) => {
        const fromCreatedAt = filters.fromCreatedAt ?? now();
        const fromShareId = filters.fromShareId ?? Number.MAX_SAFE_INTEGER;
        respond<FindSharedNotesResponse>("findSharedNotesResponse", {
            records: state.userShares
                .filter((s) => s.user_id === state.currentUser.id)
                .filter(
                    (s) =>
                        s.created_at < fromCreatedAt ||
                        (s.created_at === fromCreatedAt && s.id < fromShareId),
                )
                .sort((a, b) => b.created_at - a.created_at || b.id - a.id)
                .map((s) => toSharedMeta(state, s))
                .filter((r) => r !== null)
                .slice(0, Math.min(filters.limit ?? 10, 10)),
        });
    },
};

export const noteReminderHandlers: Pick<
    NoteHandlers,
    | "setReminder"
    | "removeReminder"
    | "findNoteReminders"
    | "getNoteReminderData"
> = {
    setReminder: ({ note_id, reminder }, { state, respond, fail }) => {
        const note = ownNote(state, note_id);
        if (!note || note.is_deleted) {
            return fail("Note does not exist or not shared with this user.");
        }
        const nextAt =
            reminder.type === "once"
                ? reminder.next_at
                : now() + reminder.interval * reminder.unit_value;
        const data =
            reminder.type === "once"
                ? {
                      next_at: nextAt - (nextAt % 60),
                      interval: null,
                      unit_value: null,
                      repeat_count: 0,
                  }
                : {
                      next_at: nextAt - (nextAt % 60),
                      interval: reminder.interval,
                      unit_value: reminder.unit_value,
                      repeat_count: reminder.repeat_count,
                  };
        const existing = state.reminders.find(
            (r) => r.note_id === note_id && r.user_id === state.currentUser.id,
        );
        if (existing) {
            Object.assign(existing, data);
        } else {
            state.reminders.push({
                id: nextId(state),
                note_id,
                user_id: state.currentUser.id,
                done_count: 0,
                ...data,
            });
        }
        respond<SetReminderResponse>("setReminderResponse", { note_id, data });
    },
    removeReminder: ({ note_id }, { state, respond }) => {
        state.reminders = state.reminders.filter(
            (r) =>
                !(r.note_id === note_id && r.user_id === state.currentUser.id),
        );
        respond<RemoveReminderResponse>("removeReminderResponse", { note_id });
    },
    findNoteReminders: ({ filters }, { state, respond }) => {
        const fromNextAt = filters.fromNextAt ?? 0;
        const fromId = filters.fromId ?? 0;
        respond<FindNoteRemindersResponse>("findNoteRemindersResponse", {
            records: state.reminders
                .filter((r) => r.user_id === state.currentUser.id)
                .filter(
                    (r) =>
                        r.next_at > fromNextAt ||
                        (r.next_at === fromNextAt && r.id > fromId),
                )
                .sort((a, b) => a.next_at - b.next_at || a.id - b.id)
                .map((r) => toReminderRecord(state, r))
                .filter((r) => r !== null)
                .slice(0, Math.min(filters.limit ?? 10, 10)),
        });
    },
    getNoteReminderData: ({ note_id }, { state, respond }) => {
        const reminder = state.reminders.find(
            (r) => r.note_id === note_id && r.user_id === state.currentUser.id,
        );
        respond<GetNoteReminderDataResponse>("getNoteReminderDataResponse", {
            data: reminder
                ? {
                      id: reminder.id,
                      next_at: reminder.next_at,
                      interval: reminder.interval,
                      unit_value: reminder.unit_value,
                      repeat_count: reminder.repeat_count,
                      done_count: reminder.done_count,
                  }
                : null,
        });
    },
};
