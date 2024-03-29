import { Handlers } from "$fresh/server.ts";
import { handleUpdateNote } from "$backend/api-handlers/notes/update-note.ts";

export const handler: Handlers = {
    PUT: handleUpdateNote,
};
