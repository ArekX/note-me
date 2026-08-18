import NoteLayout from "$components/NoteLayout.tsx";
import { defineLayout } from "fresh/compat";

export default defineLayout((ctx) => {
    return (
        <NoteLayout>
            <ctx.Component />
        </NoteLayout>
    );
});
