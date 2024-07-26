import Icon from "$components/Icon.tsx";
import { NoteSearchRecord } from "$backend/repository/note-search-repository.ts";
import { findHighlightedLines } from "$frontend/text-highlight.ts";
import { useMemo } from "preact/hooks";
import TreeItemIcon from "$islands/tree/TreeItemIcon.tsx";
import { fromTreeRecord } from "$islands/tree/hooks/record-container.ts";
import TimeAgo from "$components/TimeAgo.tsx";

interface NoteItemViewProps {
    record: NoteSearchRecord;
    searchQuery: string;
    addClass?: string;
    onNoteClick: () => void;
}

export default function NoteItemView({
    record,
    searchQuery,
    onNoteClick,
    addClass = "",
}: NoteItemViewProps) {
    const foundLines = useMemo(() =>
        findHighlightedLines(
            record.is_encrypted ? "" : record.note,
            searchQuery,
            100,
        ), [record, searchQuery]);

    return (
        <div
            class={`p-2 cursor-pointer hover:bg-gray-700 ${addClass}`}
            onClick={onNoteClick}
        >
            <TreeItemIcon
                container={fromTreeRecord({
                    type: "note",
                    is_encrypted: +record.is_encrypted,
                    name: record.title,
                    id: record.id,
                    has_children: 0,
                })}
            />{" "}
            <span class="text-lg">{record.title}</span>
            {!!record.is_encrypted && (
                <div class="text-xs py-2">(Protected contents)</div>
            )}
            {foundLines.length > 0 && (
                <div class="pt-2 pb-2">
                    {foundLines.map((line, index) => (
                        <div
                            key={index}
                            class="overflow-hidden text-ellipsis whitespace-nowrap text-xs"
                        >
                            {line.map((part, idx) => (
                                <span
                                    key={idx}
                                    class={part.type === "highlight"
                                        ? "bg-yellow-700"
                                        : ""}
                                >
                                    {part.value}
                                </span>
                            ))}
                        </div>
                    ))}
                </div>
            )}
            <div class="text-xs text-gray-400">
                {record.group_name && (
                    <>
                        <Icon name="folder" size="sm" /> {record.group_name}
                        {" "}
                    </>
                )}
                <Icon name="user" size="sm" /> {record.user_name}{"  "}
                <Icon name="time-five" size="sm" />{" "}
                <TimeAgo time={record.updated_at} />
            </div>
        </div>
    );
}
