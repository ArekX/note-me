import { FreshContext, Handlers, PageProps } from "$fresh/server.ts";
import { AppState } from "$types";
import { repository, ViewNoteRecord } from "$db";
import ViewNotePage from "$islands/notes/pages/ViewNotePage.tsx";

export interface PageData {
    note: ViewNoteRecord;
}

export const handler: Handlers<PageData> = {
    async GET(_req, ctx: FreshContext<AppState, PageData>) {
        const noteId = +ctx.params.id;

        const note = await repository.note.getNote({
            id: noteId,
            user_id: ctx.state.session?.getUserId() ?? 0,
        });

        if (!note) {
            throw new Deno.errors.NotFound("Requested note not found.");
        }

        await repository.note.updateLastOpenAt({
            note_id: noteId,
            user_id: ctx.state.session!.getUserId(),
        });

        return ctx.render({
            note,
        });
    },
};

export default function Page(props: PageProps<PageData, AppState>) {
    return <ViewNotePage note={props.data.note} />;
}
