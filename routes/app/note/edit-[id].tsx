import { FreshContext, page, PageProps } from "fresh";
import { AppState } from "$types";
import { repository, ViewNoteRecord } from "$db";
import EditNotePage from "$islands/notes/pages/EditNotePage.tsx";
import { Handlers } from "fresh/compat";

interface PageData {
    note: ViewNoteRecord;
}

export const handler: Handlers<PageData> = {
    async GET(ctx: FreshContext<AppState>) {
        const userId = ctx.state.session?.getUserId() ?? 0;

        const note = await repository.note.getNote({
            id: +ctx.params.id,
            user_id: userId,
        });

        if (!note) {
            throw new Deno.errors.NotFound("Requested note not found.");
        }

        return page({
            note,
        });
    },
};

export default function Page(props: PageProps<PageData, AppState>) {
    return <EditNotePage note={props.data.note} />;
}
