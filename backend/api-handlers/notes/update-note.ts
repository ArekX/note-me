import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { updateNoteSchema } from "$schemas/notes.ts";
import { toUpdated } from "$backend/api-responses.ts";
import {
    beginTransaction,
    commitTransaction,
    rollbackTransaction,
} from "$backend/database.ts";
import { updateNoteParent } from "$backend/repository/note-repository.ts";
import { validateRequest } from "$schemas/mod.ts";
import { UpdateNoteRequest } from "$schemas/notes.ts";

export const handleUpdateNote = async (
    req: Request,
    ctx: FreshContext<AppState>,
): Promise<Response> => {
    const noteId = +ctx.params.id!;
    const body: UpdateNoteRequest = await (req.json());

    const userId = ctx.state.session?.getUserId()!;

    await validateRequest(updateNoteSchema, body);

    await beginTransaction();

    try {
        const results = await Promise.all([
            updateNoteParent(
                noteId,
                body.group_id ? +body.group_id : null,
                userId,
            ),
        ]);

        await commitTransaction();

        return toUpdated(results.some((updated) => updated));
    } catch (e) {
        await rollbackTransaction();
        throw e;
    }
};
