import { Panel } from "$components/Panel.tsx";
import NewNote from "$islands/NewNote.tsx";
import NoteList from "$islands/NoteList.tsx";

export default function Page() {
  return (
    <div>
      <Panel>
        <NewNote />
      </Panel>
      <NoteList />
    </div>
  );
}
