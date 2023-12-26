import { FreshContext, Handlers } from "$fresh/server.ts";
import { listNotes, NoteRecord } from "../../repository/note-repository.ts";
import { AppState } from "$types";

const findNotes = async (
  _req: Request,
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
