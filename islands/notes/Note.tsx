import { Panel } from "$components/Panel.tsx";
import { NoteRecord } from "$backend/repository/note-repository.ts";
import Viewer from "$islands/Viewer.tsx";
import { formatDate } from "$backend/deps.ts";

export interface NoteProps {
  record: NoteRecord;
}

export function Note({ record }: NoteProps) {
  const time = formatDate(
    new Date(record.created_at * 1000),
    "yyyy-MM-dd HH:mm:ss",
  );
  return (
    <Panel>
      <div>At: {time}</div>
      <div>
        <Viewer markdownText={record.note} />
      </div>
    </Panel>
  );
}
