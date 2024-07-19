import { unixToDate } from "./unix.ts";

const timeAgoScale: [number, string, number][] = [
    [60, "minute", 60],
    [60, "hour", 24],
    [24, "day", 30],
    [30, "month", 12],
    [12, "year", 100],
];
export const timeAgo = (fromDate: number | Date) => {
    const subtractDate = fromDate instanceof Date
        ? fromDate
        : unixToDate(fromDate);

    let scale = (new Date().getTime() - subtractDate.getTime()) /
        1000;

    const isFuture = scale < 0;

    scale = Math.abs(scale);

    if (scale < 60) {
        const add = scale > 1 ? "s" : "";
        return isFuture
            ? `in ${Math.floor(scale)} second${add}`
            : `${Math.floor(scale)} second${add} ago`;
    }

    for (const [scaleValue, scaleName, scaleMax] of timeAgoScale) {
        scale = scale / scaleValue;
        if (scale < scaleMax) {
            const value = Math.floor(scale);

            if (isFuture) {
                return `in ${value} ${scaleName}${value > 1 ? "s" : ""}`;
            }

            return `${value} ${scaleName}${value > 1 ? "s" : ""} ago`;
        }
    }

    return isFuture ? "in far future" : "a long time ago";
};
