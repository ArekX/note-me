import { FreshContext } from "$fresh/server.ts";
import { AppState, Payload } from "$types";
import { deleteNote } from "$backend/repository/note-repository.ts";
import { toDeleted } from "$backend/api-responses.ts";

export type NoteDeletedResponse = Payload<"note-deleted", { id: number }>;

export const handleDeleteNote = async (
    _req: Request,
    ctx: FreshContext<AppState>,
): Promise<Response> => {
    const noteId = +ctx.params.id!;

    const userId = ctx.state.session?.getUserId()!;

    await deleteNote(noteId, userId);

    return toDeleted();
};
