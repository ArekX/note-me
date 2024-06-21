import { timeAgo } from "$frontend/time.ts";
import { useTimeFormat } from "$frontend/hooks/use-time-format.ts";

interface DetailsLineProps {
    groupName: string | null;
    lastUpdatedUnix?: number | null;
}

export default function DetailsLine({
    groupName,
    lastUpdatedUnix = null,
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
                    Last updated: {timeAgo(lastUpdatedUnix)}
                </div>
            )}
        </div>
    );
}
