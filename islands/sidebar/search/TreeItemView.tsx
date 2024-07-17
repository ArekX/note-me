import Icon from "$components/Icon.tsx";
import { NoteSearchRecord } from "$backend/repository/note-search-repository.ts";
import { findHighlightedLines } from "$frontend/text-highlight.ts";
import { useMemo } from "preact/hooks";
import { redirectTo } from "$frontend/redirection-manager.ts";
import { timeAgo } from "$lib/time/time-ago.ts";
import { useSearch } from "$frontend/hooks/use-search.ts";

interface TreeItemViewProps {
    record: NoteSearchRecord;
}

export default function TreeItemView({
    record,
}: TreeItemViewProps) {
    const search = useSearch();
    const foundLines = useMemo(() =>
        findHighlightedLines(
            record.note,
            search.query.value,
            100,
        ), [record, search.query.value]);

    const handleOpenNote = () => {
        redirectTo.viewNote({
            noteId: record.id,
        });
    };

    return (
        <div
            class="p-2 cursor-pointer hover:bg-gray-700"
            onClick={handleOpenNote}
        >
            <Icon name="note" /> <span class="text-lg">{record.title}</span>
            <div class="text-xs text-gray-400">
                {record.group_name && (
                    <>
                        <Icon name="folder" size="sm" /> {record.group_name}
                        {" "}
                    </>
                )}
                <Icon name="user" size="sm" /> {record.user_name}{"  "}
                <Icon name="time-five" size="sm" /> {timeAgo(record.updated_at)}
            </div>
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
        </div>
    );
}
