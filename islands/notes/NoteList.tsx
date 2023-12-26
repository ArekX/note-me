import { useSignal } from "@preact/signals";
import Loader from "$islands/Loader.tsx";
import { Note } from "./Note.tsx";
import { NoteRecord } from "$backend/repository/note-repository.ts";
import { useEffect, useRef } from "preact/hooks";
import { findNotes } from "$frontend/api.ts";
import { Panel } from "$components/Panel.tsx";
import NewNote from "$islands/notes/NewNote.tsx";
import { useLoadMore } from "$frontend/hooks/use-load-more.ts";

export default function NoteList() {
  const notes = useSignal<NoteRecord[]>([]);
  const showLoader = useSignal(false);
  const hasMoreData = useSignal(true);
  const noteDiv = useRef(null);

  const loadMore = async (): Promise<void> => {
    if (showLoader.value || !hasMoreData.value) {
      return;
    }

    showLoader.value = true;

    const loadedNotes = await findNotes({});

    notes.value = [...notes.value, ...loadedNotes.data];
    showLoader.value = false;
    hasMoreData.value = false; // TODO: fix this
  };

  useLoadMore(loadMore, hasMoreData, noteDiv);

  const processNoteAdded = (note: NoteRecord) => {
    notes.value = [note, ...notes.value];
  };

  useEffect(() => {
    loadMore();
  }, []);

  return (
    <div className="w-4/5 bg-gray-900 overflow-auto" ref={noteDiv}>
      <Panel>
        <NewNote onNewNoteAdded={processNoteAdded} />
      </Panel>
      <div>
        {notes.value.map((note) => <Note record={note} />)}
        <Loader visible={showLoader.value}>
          Enriching your note list with more notes...
        </Loader>
      </div>
    </div>
  );
}
