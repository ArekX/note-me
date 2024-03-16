import { Handlers } from "$fresh/server.ts";
import { handleAddNote } from "$backend/api-handlers/notes/add-note.ts";
import { handleFindNotes } from "$backend/api-handlers/notes/find-notes.ts";

export const handler: Handlers = {
    POST: handleAddNote,
    GET: handleFindNotes,
};
