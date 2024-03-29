import { FreshContext, Handlers, PageProps } from "$fresh/server.ts";
import { AppState } from "$types";
import {
    getNote,
    ViewNoteRecord,
} from "$backend/repository/note-repository.ts";

interface PageData {
    note: ViewNoteRecord | null;
}

export const handler: Handlers<PageData> = {
    async GET(_req, ctx: FreshContext<AppState, PageData>) {
        const noteId = +ctx.params.id;

        const note = await getNote(
            noteId,
            ctx.state.session?.getUserId() ?? 0,
        );

        if (!note) {
            throw new Deno.errors.NotFound("Requested note not found.");
        }

        return ctx.render({
            note,
        });
    },
};

export default function Page(props: PageProps<PageData, AppState>) {
    return (
        <div class="text-white p-4">
            <div class="text-2xl font-bold">
                {props.data.note?.title}
            </div>
            <div>
                {props.data.note?.group_name}
            </div>
            <div>
                Tags
            </div>
            <div>
                {props.data.note?.note}
            </div>
        </div>
    );
}
