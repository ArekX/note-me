import { redirectTo } from "$frontend/redirection-manager.ts";
import TreeItemIcon from "$islands/tree/TreeItemIcon.tsx";
import { fromTreeRecord } from "$islands/tree/hooks/record-container.ts";
import { UserSharedNoteMeta } from "$backend/repository/note-share-repository.ts";
import Icon from "$components/Icon.tsx";
import TimeAgo from "$components/TimeAgo.tsx";
import { activeNoteId } from "$frontend/hooks/use-active-note.ts";

interface SharedNoteItemProps {
    addClass?: string;
    record: UserSharedNoteMeta;
}

export default function SharedNoteItem(
    { record, addClass = "" }: SharedNoteItemProps,
) {
    const handleOpenNote = () => {
        redirectTo.viewSharedNote({
            noteId: +record.id,
        });
    };

    const itemClass = activeNoteId.value === record.id
        ? "bg-sky-700/50"
        : "hover:bg-gray-700/50";

    return (
        <div
            class={`p-2 ${itemClass} cursor-pointer ${addClass}`}
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
            <div class="text-sm text-gray-400">
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
