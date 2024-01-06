import { FreshContext, Handlers } from "$fresh/server.ts";
import { listNotes, NoteRecord } from "$backend/repository/note-repository.ts";
import { AppState } from "$types";

export interface FindNotesRequest {
  search?: string;
}

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
