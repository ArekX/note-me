import { FreshContext } from "$fresh/server.ts";
import { listNotes } from "$backend/repository/note-repository.ts";
import { AppState } from "$types";

export interface FindNotesRequest {
    search?: string;
}

export const handleFindNotes = async (
    _req: Request,
    ctx: FreshContext<AppState>,
): Promise<Response> => {
    const results = await listNotes({
        user_id: ctx.state.session?.data.user?.id ?? -1,
    });

    return new Response(JSON.stringify(results));
};
