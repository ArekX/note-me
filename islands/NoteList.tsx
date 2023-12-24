import { type Signal, useSignal } from "@preact/signals";
import Loader from "$islands/Loader.tsx";
import { Note } from "$islands/Note.tsx";
import { NoteRecord } from "../repository/note-repository.ts";
import { useEffect } from "preact/hooks";
import { findNotes } from "$frontend/api.ts";

export default function NoteList() {
  const notes = useSignal<NoteRecord[]>([]);
  const showLoader = useSignal(false);

  const loadMore = async () => {
    showLoader.value = true;

    const loadedNotes = await findNotes({});

    notes.value = [...notes.value, ...loadedNotes.data];
    showLoader.value = false;
  };

  useEffect(() => {
    loadMore();
  }, []);

  return (
    <div>
      {notes.value.map((note) => <Note record={note} />)}
      <Loader visible={showLoader.value}>
        Enriching your notes with another one...
      </Loader>
    </div>
  );
}
