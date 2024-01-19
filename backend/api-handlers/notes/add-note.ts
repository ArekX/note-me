import { FreshContext, Handlers } from "$fresh/server.ts";
import { AppState } from "$types";
import { AddNoteRequest } from "$schemas/notes.ts";
import { createNoteAggregate } from "$backend/aggregates/note.aggregate.ts";

export const handleAddNote = async (
  req: Request,
  ctx: FreshContext<AppState>,
): Promise<Response> => {
  const body: AddNoteRequest = await (req.json());

  const { id: userId = -1 } = ctx.state.session?.data.user ?? {};

  const result = await createNoteAggregate({
    ...body,
    user_id: userId,
  });

  return new Response(JSON.stringify(result), {
    status: 201,
  });
};
