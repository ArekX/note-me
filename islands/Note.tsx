import { Panel } from "$components/Panel.tsx";
import { NoteRecord } from "../repository/note-repository.ts";
import Viewer from "$islands/Viewer.tsx";

export interface NoteProps {
  record: NoteRecord;
}

export function Note({ record }: NoteProps) {
  return (
    <Panel>
      <Viewer markdownText={record.note} />
    </Panel>
  );
}
