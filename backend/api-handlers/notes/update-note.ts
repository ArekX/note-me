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
import { updateNote } from "$backend/repository/note-repository.ts";
import { when } from "$backend/promise.ts";
import { linkNoteWithTags } from "$backend/repository/note-tags-repository.ts";

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
            when(
                () => "group_id" in body,
                () =>
                    updateNoteParent(
                        noteId,
                        body.group_id ? +body.group_id : null,
                        userId,
                    ),
                () => Promise.resolve(true),
            ),
            when(
                () => [body.title, body.text].some(Boolean),
                () =>
                    updateNote(
                        noteId,
                        userId,
                        {
                            title: body.title,
                            note: body.text,
                        },
                    ),
                () => Promise.resolve(true),
            ),
            when(
                () => !!body.tags,
                () => linkNoteWithTags(noteId, userId, body.tags!),
                () => Promise.resolve(true),
            ),
        ]);

        await commitTransaction();

        return toUpdated(results.some((updated) => updated));
    } catch (e) {
        await rollbackTransaction();
        throw e;
    }
};
