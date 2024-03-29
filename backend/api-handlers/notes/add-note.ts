import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { AddNoteRequest, addNoteRequestSchema } from "$schemas/notes.ts";
import { toCreated } from "$backend/api-responses.ts";
import {
    beginTransaction,
    commitTransaction,
    rollbackTransaction,
} from "$backend/database.ts";
import { linkNoteWithTags } from "$backend/repository/note-tags-repository.ts";
import { assignNoteToGroup } from "$backend/repository/group-repository.ts";
import { createNote } from "$backend/repository/note-repository.ts";
import { validateRequest } from "$schemas/mod.ts";

export const handleAddNote = async (
    req: Request,
    ctx: FreshContext<AppState>,
): Promise<Response> => {
    const body: AddNoteRequest = await (req.json());

    const userId = ctx.state.session?.getUserId()!;

    await validateRequest(addNoteRequestSchema, body);

    await beginTransaction();

    try {
        const record = await createNote({
            title: body.title,
            note: body.text,
            user_id: userId,
        });

        await Promise.all([
            linkNoteWithTags(record.id, body.tags),
            assignNoteToGroup(body.group_id, record.id, userId),
        ]);

        await commitTransaction();

        return toCreated(record);
    } catch (e) {
        await rollbackTransaction();
        throw e;
    }
};
