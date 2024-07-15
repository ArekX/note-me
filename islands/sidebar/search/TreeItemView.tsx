import Icon from "$components/Icon.tsx";
import { SearchRequest } from "$islands/sidebar/hooks/use-search-state.ts";
import { NoteSearchRecord } from "$backend/repository/note-search-repository.ts";

interface TreeItemViewProps {
    searchQuery: SearchRequest;
    record: NoteSearchRecord;
}

interface TextPart {
    type: "text" | "highlight";
    value: string;
}

function highlightText(text: string, searchString: string) {
    const parts: TextPart[] = [];
    searchString = searchString.toLowerCase();
    let foundIndex = text.toLowerCase().indexOf(searchString);

    while (foundIndex > -1) {
        let prefixText = text.substring(0, foundIndex);

        if (prefixText.length / text.length > 0.3) {
            prefixText = "..." + prefixText.substring(prefixText.length - 10);
        }

        parts.push({ type: "text", value: prefixText });
        parts.push({
            type: "highlight",
            value: text.substring(
                foundIndex,
                foundIndex + searchString.length,
            ),
        });

        text = text.substring(foundIndex + searchString.length);
        foundIndex = text.toLowerCase().indexOf(searchString);
    }

    if (text.length > 0) {
        parts.push({ type: "text", value: text });
    }

    return parts;
}

function findMatchingLines(text: string, searchString: string) {
    if (text.length === 0 || searchString.length === 0) {
        return [];
    }

    const lines: TextPart[][] = [];

    let foundIndex = text.indexOf(searchString);

    while (foundIndex > -1 && lines.length < 3) {
        const start = Math.max(0, foundIndex - 50);
        const addToRight = foundIndex - start;

        const end = Math.min(text.length, foundIndex + 50 + addToRight);
        const line = text.substring(start, end);
        lines.push(highlightText(line, searchString));

        foundIndex = text.indexOf(searchString, foundIndex + end);
    }

    return lines;
}

export default function TreeItemView({
    searchQuery,
    record,
}: TreeItemViewProps) {
    const foundLines = findMatchingLines(
        record.note,
        searchQuery.type === "simple" ? searchQuery.query : "",
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
