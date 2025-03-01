import { FreshContext, PageProps } from "$fresh/server.ts";
import { PublicSharedNote, repository } from "$db";
import { AppState } from "$types";
import ViewNote from "$islands/notes/ViewNote.tsx";

export const handler = async (_req: Request, ctx: FreshContext<AppState>) => {
    const identifier: string = ctx.params.identifier ?? "";

    const sharedNote = await repository.noteShare.getPublicShareNote(
        identifier,
    );

    if (!sharedNote) {
        throw new Deno.errors.NotFound("Note not found.");
    }

    if (sharedNote.is_encrypted) {
        throw new Deno.errors.PermissionDenied(
            "This note is protected by its owner and cannot be viewed.",
        );
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
        <div class="text-white lg:max-xl:w-3/4 xl:w-1/2 max-lg:px-5 ml-auto mr-auto pt-8 pb-10">
            <ViewNote
                readonly
                shareMode="everyone"
                disableTagLinks
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
