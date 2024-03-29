import { Handlers } from "$fresh/server.ts";
import { handleAddNote } from "$backend/api-handlers/notes/add-note.ts";

export const handler: Handlers = {
    POST: handleAddNote,
};
