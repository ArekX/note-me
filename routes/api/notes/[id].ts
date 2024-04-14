import { Handlers } from "$fresh/server.ts";
import { handleUpdateNote } from "$backend/api-handlers/notes/update-note.ts";
import { handleDeleteNote } from "$backend/api-handlers/notes/delete-note.ts";

export const handler: Handlers = {
    PUT: handleUpdateNote,
    DELETE: handleDeleteNote,
};
