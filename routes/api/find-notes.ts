import { FreshContext, Handlers } from "$fresh/server.ts";
import { listNotes, NoteRecord } from "../../repository/note-repository.ts";
import { AppState } from "$types/app-state.ts";
import { ListNotesRequest } from "$frontend/api.ts";

const findNotes = async (
  req: Request,
  ctx: FreshContext<AppState>,
): Promise<Response> => {
  const results = await listNotes({
    user_id: ctx.state.session?.data.user?.id ?? -1,
  });

  return new Response(JSON.stringify(results));
};

export const handler: Handlers<NoteRecord[]> = {
  GET: findNotes,
};
