import Icon from "$components/Icon.tsx";
import { SearchRequest } from "$islands/sidebar/hooks/use-search-state.ts";
import { NoteSearchRecord } from "$backend/repository/note-search-repository.ts";
import { findHighlightedLines } from "$frontend/text-highlight.ts";

interface TreeItemViewProps {
    searchQuery: SearchRequest;
    record: NoteSearchRecord;
}

export default function TreeItemView({
    searchQuery,
    record,
}: TreeItemViewProps) {
    const foundLines = findHighlightedLines(
        record.note,
        searchQuery.type === "simple" ? searchQuery.query : "",
        100,
    );

    return (
        <div class="p-2 cursor-pointer hover:bg-gray-700">
            <Icon name="note" /> <span class="text-lg">{record.title}</span>
            <div class="p-2">
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
        </div>
    );
}
