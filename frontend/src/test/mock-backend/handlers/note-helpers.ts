import type {
    DeletedNoteRecord,
    ReminderNoteRecord,
    UserSharedNoteMeta,
} from "@/types/records";
import { nextId } from "../handler";
import { now, type MockNote, type MockState } from "../state";

export const ownNote = (state: MockState, id: number): MockNote | undefined =>
    state.notes.find((n) => n.id === id && n.user_id === state.currentUser.id);

export const ownGroup = (state: MockState, id: number) =>
    state.groups.some((g) => g.id === id);

// Tags are global and matched by name; missing ones are created.
export const normalizeTags = (state: MockState, tags: string[]): string[] => {
    const names = [
        ...new Set(
            tags
                .map((tag) => tag.toLowerCase().trim().replace(/ /g, ""))
                .filter(Boolean),
        ),
    ];
    for (const name of names) {
        if (!state.tags.some((t) => t.name === name)) {
            state.tags.push({ id: nextId(state), name });
        }
    }
    return names;
};

export const groupName = (
    state: MockState,
    groupId: number | null,
): string | null => state.groups.find((g) => g.id === groupId)?.name ?? null;

export const userName = (state: MockState, userId: number): string =>
    state.users.find((u) => u.id === userId)?.name ?? "Unknown";

export const toReminderRecord = (
    state: MockState,
    reminder: MockState["reminders"][number],
): ReminderNoteRecord | null => {
    const note = state.notes.find((n) => n.id === reminder.note_id);
    if (!note || note.is_deleted) {
        return null;
    }
    return {
        id: reminder.id,
        note_id: note.id,
        done_count: reminder.done_count,
        interval: reminder.interval,
        unit_value: reminder.unit_value,
        repeat_count: reminder.repeat_count,
        next_at: reminder.next_at,
        title: note.title,
        is_encrypted: note.is_encrypted,
        author_id: note.user_id,
        author_name: userName(state, note.user_id),
        type: reminder.interval ? "repeat" : "once",
    };
};

export const toSharedMeta = (
    state: MockState,
    share: MockState["userShares"][number],
): UserSharedNoteMeta | null => {
    const note = state.notes.find((n) => n.id === share.note_id);
    if (!note || note.is_deleted) {
        return null;
    }
    return {
        id: note.id,
        share_id: share.id,
        title: note.title,
        is_encrypted: note.is_encrypted,
        user_name: userName(state, note.user_id),
        created_at: share.created_at,
    };
};

export const toDeletedRecord = (note: MockNote): DeletedNoteRecord => ({
    id: note.id,
    title: note.title,
    is_encrypted: note.is_encrypted,
    deleted_at: note.deleted_at,
});

// Snapshot of the note before an update, named like the server does.
export const addHistory = (
    state: MockState,
    note: MockNote,
    isReversal = false,
) => {
    const count = state.history.filter((h) => h.note_id === note.id).length;
    state.history.push({
        id: nextId(state),
        note_id: note.id,
        version: `Version ${count + 1}${isReversal ? " (before reversal)" : ""}`,
        created_at: now(),
        is_encrypted: note.is_encrypted,
        title: note.title,
        note: note.note,
        tags: note.tags.join(","),
    });
};
