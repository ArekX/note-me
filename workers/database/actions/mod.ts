import { note, NoteAction } from "$workers/database/actions/note.ts";

export type ActionData = NoteAction;

export const actions = {
    note,
};
