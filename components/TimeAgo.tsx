import { timeAgo } from "$lib/time/time-ago.ts";
import { useTimeFormat } from "$frontend/hooks/use-time-format.ts";
import { ComponentChild } from "preact";

interface TimeAgoProps {
    time?: number | Date | null;
    emptyText?: string | ComponentChild;
}

export default function TimeAgo({ time, emptyText = "N/A" }: TimeAgoProps) {
    if (!time) {
        return <span>{emptyText ?? null}</span>;
    }

    const formatter = useTimeFormat();

    return <span title={formatter.formatDateTime(time)}>{timeAgo(time)}</span>;
}
