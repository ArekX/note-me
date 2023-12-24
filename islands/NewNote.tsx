import { type Signal, useSignal } from "@preact/signals";
import Viewer from "$islands/Viewer.tsx";
import Button from "$islands/Button.tsx";
import Loader from "$islands/Loader.tsx";
import { createNote } from "$frontend/api.ts";

export default function NewNote() {
  const text = useSignal("");
  const showLoader = useSignal(false);

  const addNewNote = async () => {
    showLoader.value = true;
    const record = await createNote({
      text: text.value,
    });

    console.log(record);

    text.value = "";
    showLoader.value = false;
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
