import { FreshContext, Handlers } from "$fresh/server.ts";
import { createNote, NoteRecord } from "../../repository/note-repository.ts";
import { AppState } from "$types";
import { CreateNoteRequest } from "$frontend/api.ts";

const handleNoteCreation = async (
  req: Request,
  ctx: FreshContext<AppState>,
): Promise<Response> => {
  const body = await (req.json()) as CreateNoteRequest;

  const record = await createNote({
    note: body.text,
    user_id: ctx.state.session?.data.user?.id ?? -1,
  });

  return new Response(JSON.stringify(record), {
    status: 201,
  });
};

export const handler: Handlers<NoteRecord | null> = {
  POST: handleNoteCreation,
};
