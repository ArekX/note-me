import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { getNoteDetails } from "$backend/repository/note-repository.ts";
import { toSingleResult } from "$backend/api-responses.ts";

export const handleGetNoteDetails = async (
    _req: Request,
    ctx: FreshContext<AppState>,
): Promise<Response> => {
    const noteId = +ctx.params.id!;

    const userId = ctx.state.session?.getUserId()!;

    const note = await getNoteDetails(noteId, userId);

    if (!note) {
        throw new Deno.errors.NotFound("Note not found");
    }

    return toSingleResult(note);
};
