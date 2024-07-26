import { redirectTo } from "$frontend/redirection-manager.ts";
import TreeItemIcon from "$islands/tree/TreeItemIcon.tsx";
import { fromTreeRecord } from "$islands/tree/hooks/record-container.ts";
import { UserSharedNoteMeta } from "$backend/repository/note-share-repository.ts";
import Icon from "$components/Icon.tsx";
import TimeAgo from "$components/TimeAgo.tsx";

interface SharedNoteItemProps {
    record: UserSharedNoteMeta;
}

export default function SharedNoteItem({ record }: SharedNoteItemProps) {
    const handleOpenNote = () => {
        redirectTo.viewSharedNote({
            noteId: +record.id,
        });
    };

    return (
        <div
            class="p-2 hover:bg-gray-700 cursor-pointer"
            onClick={() => handleOpenNote()}
        >
            <TreeItemIcon
                container={fromTreeRecord({
                    type: "note",
                    id: record.id,
                    name: record.title,
                    is_encrypted: +record.is_encrypted,
                    has_children: 0,
                })}
            />{" "}
            {record.title}
            <div class="text-sm text-gray-500">
                <span>
                    <Icon name="share-alt" size="sm" /> by {record.user_name},
                    {" "}
                    <Icon name="time-five" size="sm" />{" "}
                    <TimeAgo time={record.created_at} />
                </span>
            </div>
        </div>
    );
}
