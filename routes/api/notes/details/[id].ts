import { Handlers } from "$fresh/server.ts";
import { handleGetNoteDetails } from "$backend/api-handlers/notes/get-note-details.ts";

export const handler: Handlers = {
    GET: handleGetNoteDetails,
};
