import { useSignal } from "@preact/signals";
import Viewer from "$islands/Viewer.tsx";

import Loader from "$islands/Loader.tsx";
import { createNote } from "$frontend/api.ts";
import { NoteRecord } from "$backend/repository/note-repository.ts";
import { ErrorDisplay } from "$components/ErrorDisplay.tsx";
import { SchemaErrors } from "$types";
import { Button } from "$components/Button.tsx";
import { addNoteRequestSchema } from "$schemas/notes.ts";
import { AddNoteRequest } from "$schemas/notes.ts";

interface NewNoteProps {
    onNewNoteAdded?: (note: NoteRecord) => void;
}

export default function NewNote({ onNewNoteAdded }: NewNoteProps = {}) {
    const text = useSignal("");
    const showLoader = useSignal(false);
    const schemaErrors = useSignal<
        SchemaErrors<AddNoteRequest> | null
    >(null);

    const addNewNote = async () => {
        const result = addNoteRequestSchema.safeParse({ text: text.value });

        if (!result.success) {
            schemaErrors.value = result.error.format();
            return;
        }

        showLoader.value = true;
        const record = await createNote({
            title: "opopo",
            group_id: null,
            tags: [],
            text: text.value,
        });

        text.value = "";
        showLoader.value = false;

        onNewNoteAdded?.(record.data);
    };

    return (
        <div>
            <div>
                <textarea
                    class="border-solid border-2 w-full block h-48 p-2 border-s-sky-950 outline-none"
                    value={text}
                    onInput={(e) =>
                        text.value =
                            (e?.target as HTMLTextAreaElement)?.value ?? ""}
                />
                <ErrorDisplay errors={schemaErrors.value?.text} />
            </div>

            <div>
                <Viewer markdownText={text.value} />
            </div>
            <Button type="button" onClick={addNewNote}>Post</Button>
            <Loader visible={showLoader.value}>
                Enriching your notes with another one...
            </Loader>
        </div>
    );
}
