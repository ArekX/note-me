import { FreshContext, page, PageProps } from "fresh";
import { AppState } from "$types";
import ViewNote from "$islands/notes/ViewNote.tsx";
import { PublicSharedNote } from "$db";
import { repository } from "$db";
import { Handlers } from "fresh/compat";

export const handler: Handlers<PageData> = {
    async GET(ctx: FreshContext<AppState>) {
        const noteId = +ctx.params.id;

        const note = await repository.noteShare.getUserShareNote({
            note_id: noteId,
            user_id: ctx.state.session?.getUserId() ?? 0,
        });

        if (!note) {
            throw new Deno.errors.NotFound("Requested note not found.");
        }

        if (note.is_encrypted) {
            throw new Deno.errors.PermissionDenied(
                "This note is protected by its owner and cannot be viewed.",
            );
        }

        return page({
            note,
        });
    },
};

export interface PageData {
    note: PublicSharedNote;
}

export default function Page(props: PageProps<PageData, AppState>) {
    return (
        <ViewNote
            readonly
            author={props.data.note.user_name}
            shareMode="users"
            record={{
                ...props.data.note,
                group_id: 0,
                group_name: "",
            }}
        />
    );
}
