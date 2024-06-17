import { timeAgo } from "$frontend/time.ts";
import { getUserData } from "$frontend/user-data.ts";

interface DetailsLineProps {
    groupName: string | null;
    lastUpdatedUnix?: number | null;
}

export default function DetailsLine({
    groupName,
    lastUpdatedUnix = null,
}: DetailsLineProps) {
    const lastUpdatedTitle = lastUpdatedUnix !== null
        ? getUserData().formatDateTime(lastUpdatedUnix)
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
