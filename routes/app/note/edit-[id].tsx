import { FreshContext, Handlers, PageProps } from "$fresh/server.ts";
import { AppState } from "$types";
import { repository, ViewNoteRecord } from "$db";
import EditNotePage from "$islands/notes/pages/EditNotePage.tsx";

interface PageData {
    note: ViewNoteRecord;
}

export const handler: Handlers<PageData> = {
    async GET(_, ctx: FreshContext<AppState, PageData>) {
        const userId = ctx.state.session?.getUserId() ?? 0;

        const note = await repository.note.getNote({
            id: +ctx.params.id,
            user_id: userId,
        });

        if (!note) {
            throw new Deno.errors.NotFound("Requested note not found.");
        }

        return ctx.render({
            note,
        });
    },
};

export default function Page(props: PageProps<PageData, AppState>) {
    return <EditNotePage note={props.data.note} />;
}
