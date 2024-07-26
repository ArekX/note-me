import { useTimeFormat } from "$frontend/hooks/use-time-format.ts";
import TimeAgo from "$components/TimeAgo.tsx";

interface DetailsLineProps {
    groupName: string | null;
    lastUpdatedUnix?: number | null;
    author?: string | null;
}

export default function DetailsLine({
    groupName,
    lastUpdatedUnix = null,
    author,
}: DetailsLineProps) {
    const timeFormatter = useTimeFormat();

    const lastUpdatedTitle = lastUpdatedUnix !== null
        ? timeFormatter.formatDateTime(lastUpdatedUnix)
        : "";

    return (
        <div class="flex justify-between text-xs">
            {groupName && (
                <div>
                    &rarr; in {groupName}
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
