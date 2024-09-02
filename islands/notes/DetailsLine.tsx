import { useTimeFormat } from "$frontend/hooks/use-time-format.ts";
import TimeAgo from "$components/TimeAgo.tsx";
import { useSearch } from "$frontend/hooks/use-search.ts";

interface DetailsLineProps {
    groupId: number | null;
    groupName: string | null;
    lastUpdatedUnix?: number | null;
    author?: string | null;
}

export default function DetailsLine({
    groupId,
    groupName,
    lastUpdatedUnix = null,
    author,
}: DetailsLineProps) {
    const timeFormatter = useTimeFormat();

    const lastUpdatedTitle = lastUpdatedUnix !== null
        ? timeFormatter.formatDateTime(lastUpdatedUnix)
        : "";

    const search = useSearch();

    const handleGroupSearch = () => {
        search.setGroup({
            id: groupId!,
            name: groupName!,
            has_children: 0,
            is_encrypted: 0,
            type: "group",
        });
    };

    return (
        <div class="flex justify-between text-xs">
            {groupName && (
                <div>
                    &rarr; in{" "}
                    <span
                        class="cursor-pointer underline"
                        onClick={handleGroupSearch}
                    >
                        {groupName}
                    </span>
                </div>
            )}
            {lastUpdatedUnix !== null && (
                <div title={lastUpdatedTitle}>
                    Last updated: <TimeAgo time={lastUpdatedUnix} />
                </div>
            )}
            {author && (
                <div>
                    Author: {author}
                </div>
            )}
        </div>
    );
}
