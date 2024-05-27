import { defineLayout } from "$fresh/server.ts";
import NoteLayout from "$components/NoteLayout.tsx";

export default defineLayout((_, ctx) => {
    return (
        <NoteLayout>
            <ctx.Component />
        </NoteLayout>
    );
});
