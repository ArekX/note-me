export const noteWindowTypes = [
    "details",
    "history",
    "remind",
    "share",
    "files",
    "move",
    "delete",
] as const;

export type NoteWindowType = (typeof noteWindowTypes)[number];

export const isNoteWindowType = (action: string): action is NoteWindowType =>
    (noteWindowTypes as readonly string[]).includes(action);
