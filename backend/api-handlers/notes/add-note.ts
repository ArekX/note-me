import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { AddNoteRequest } from "$schemas/notes.ts";
import { createNoteAggregate } from "$backend/aggregates/note.aggregate.ts";
import { toCreated } from "$backend/api-responses.ts";

export const handleAddNote = async (
    req: Request,
    ctx: FreshContext<AppState>,
): Promise<Response> => {
    const body: AddNoteRequest = await (req.json());

    const userId = ctx.state.session?.getUserId()!;

    const result = await createNoteAggregate({
        ...body,
        user_id: userId,
    });

    return toCreated(result);
};
