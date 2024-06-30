import { FreshContext, PageProps } from "$fresh/server.ts";
import {
    getPublicShareNote,
    PublicSharedNote,
} from "$backend/repository/note-share-repository.ts";
import { AppState } from "$types";
import ViewNote from "$islands/notes/ViewNote.tsx";

export const handler = async (_req: Request, ctx: FreshContext<AppState>) => {
    const identifier: string = ctx.params.identifier ?? "";

    const sharedNote = await getPublicShareNote(identifier);

    if (!sharedNote) {
        throw new Deno.errors.NotFound("Note not found.");
    }

    return ctx.render({
        pageTitle: sharedNote.title,
        note: sharedNote,
    });
};

interface PageData {
    pageTitle: string;
    note: PublicSharedNote;
}

export default function Page(props: PageProps<PageData, AppState>) {
    return (
        <div class="text-white w-1/2 ml-auto mr-auto pt-8 pb-10">
            <ViewNote
                readonly={true}
                disableTagLinks={true}
                author={props.data.note.user_name}
                record={{
                    ...props.data.note,
                    group_id: 0,
                    group_name: "",
                }}
            />
        </div>
    );
}
