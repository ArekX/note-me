import { FreshContext, Handlers, PageProps } from "$fresh/server.ts";
import { AppState } from "$types";
import NoteEditor from "$islands/notes/NoteEditor.tsx";
import {
    getNote,
    ViewNoteRecord,
} from "$backend/repository/note-repository.ts";

interface PageData {
    note: ViewNoteRecord;
}

export const handler: Handlers<PageData> = {
    async GET(_, ctx: FreshContext<AppState, PageData>) {
        const userId = ctx.state.session?.getUserId() ?? 0;

        const note = await getNote(+ctx.params.id, userId);

        if (!note) {
            throw new Deno.errors.NotFound("Requested note not found.");
        }

        return ctx.render({
            note,
        });
    },
};

export default function Page(props: PageProps<PageData, AppState>) {
    const { note } = props.data;

    return (
        <NoteEditor
            note={{
                id: note.id,
                title: note.title,
                note: note.note,
                tags: note.tags,
                is_encrypted: note.is_encrypted,
                group_id: note.group_id,
                group_name: note.group_name,
            }}
        />
    );
}
