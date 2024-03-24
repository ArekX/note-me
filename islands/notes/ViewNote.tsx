import { Panel } from "$components/Panel.tsx";
import { NoteRecord } from "$backend/repository/note-repository.ts";
import Viewer from "$islands/Viewer.tsx";
import { getUserData } from "$frontend/user-data.ts";

export interface NoteProps {
    record: NoteRecord;
}

export function Note({ record }: NoteProps) {
    const time = getUserData().formatDateTime(
        new Date(record.created_at * 1000),
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
