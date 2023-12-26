import { type Signal, useSignal } from "@preact/signals";
import Viewer from "$islands/Viewer.tsx";
import Button from "$islands/Button.tsx";
import Loader from "$islands/Loader.tsx";
import { createNote } from "$frontend/api.ts";
import { NoteRecord } from "$repository";
import { zod } from "$vendor";
import { ErrorDisplay } from "$components/ErrorDisplay.tsx";
import { SchemaErrors } from "$types";

interface NewNoteProps {
  onNewNoteAdded?: (note: NoteRecord) => void;
}

const newNoteSchema = zod.object({
  text: zod.string().min(1, "Note must have at least one character"),
});

export default function NewNote({ onNewNoteAdded }: NewNoteProps = {}) {
  const text = useSignal("");
  const showLoader = useSignal(false);
  const schemaErrors = useSignal<
    SchemaErrors<typeof newNoteSchema>
  >(null);

  const addNewNote = async () => {
    const result = newNoteSchema.safeParse({ text: text.value });

    if (!result.success) {
      schemaErrors.value = result.error.format();
      return;
    }

    showLoader.value = true;
    const record = await createNote({
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
            text.value = (e?.target as HTMLTextAreaElement)?.value ?? ""}
        />
        <ErrorDisplay errors={schemaErrors.value?.text} />
      </div>

      <div>
        <Viewer markdownText={text.value} />
      </div>
      <Button name="Post" onClick={addNewNote} />
      <Loader visible={showLoader.value}>
        Enriching your notes with another one...
      </Loader>
    </div>
  );
}
