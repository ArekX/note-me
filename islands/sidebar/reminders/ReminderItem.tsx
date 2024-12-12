import { ReminderNoteRecord } from "../../../workers/database/query/note-reminder-repository.ts";
import { redirectTo } from "$frontend/redirection-manager.ts";
import { useUser } from "$frontend/hooks/use-user.ts";
import TreeItemIcon from "$islands/tree/TreeItemIcon.tsx";
import { fromTreeRecord } from "$islands/tree/hooks/record-container.ts";
import { useTimeFormat } from "$frontend/hooks/use-time-format.ts";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import { useSignal } from "@preact/signals";
import NoteWindow from "$islands/notes/NoteWindow.tsx";
import TimeAgo from "$components/TimeAgo.tsx";
import { activeNoteId } from "$frontend/hooks/use-active-note.ts";
import { JSX } from "preact";

interface ReminderItemProps {
    addClass?: string;
    hideReminderButton?: boolean;
    buttons?: JSX.Element;
    record: ReminderNoteRecord;
}

export default function ReminderItem(
    { record, addClass = "", buttons, hideReminderButton }: ReminderItemProps,
) {
    const user = useUser();
    const timeFormatter = useTimeFormat();

    const isReminderWindowOpen = useSignal(false);
    const handleOpenNote = () => {
        if (record.author_id === user.getUserId()) {
            redirectTo.viewNote({
                noteId: +record.note_id,
            });
            return;
        }

        redirectTo.viewSharedNote({
            noteId: +record.note_id,
        });
    };

    const handleOpenReminderWindow = (e: Event) => {
        e.stopPropagation();
        isReminderWindowOpen.value = true;
    };

    const itemClass = activeNoteId.value === record.note_id
        ? "bg-sky-700/50"
        : "hover:bg-gray-700/50";

    return (
        <div
            key={record.id}
            class={`${itemClass} cursor-pointer items-center flex group ${addClass}`}
            onClick={handleOpenNote}
        >
            <div class="flex-grow p-2">
                <TreeItemIcon
                    container={fromTreeRecord({
                        type: "note",
                        id: record.note_id,
                        name: record.title,
                        is_encrypted: +record.is_encrypted,
                        has_children: 0,
                    })}
                />{" "}
                {record.title}
                <div class="text-sm text-gray-400">
                    <span
                        title={record.next_at
                            ? timeFormatter.formatDateTime(
                                record.next_at,
                            )
                            : ""}
                    >
                        <span title="Reminder at">
                            <Icon name="alarm" size="sm" />
                            {" "}
                        </span>
                        <TimeAgo time={record.next_at} />
                    </span>
                </div>
            </div>
            <div class="max-lg:hidden text-right hidden group-hover:lg:block pr-2">
                {!hideReminderButton && (
                    <Button
                        color="primary"
                        title="Edit reminder"
                        onClick={handleOpenReminderWindow}
                    >
                        <Icon name="alarm" size="sm" />
                    </Button>
                )}
                {buttons}
            </div>
            {isReminderWindowOpen.value && (
                <NoteWindow
                    onClose={() => isReminderWindowOpen.value = false}
                    type="remind"
                    noteId={record.note_id}
                />
            )}
        </div>
    );
}
