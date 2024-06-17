export const unixToDate = (unix: number) => new Date(unix * 1000);

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

    if (scale < 0) {
        return "in the future";
    }

    if (scale < 60) {
        return "just now";
    }

    for (const [scaleValue, scaleName, scaleMax] of timeAgoScale) {
        scale = scale / scaleValue;
        if (scale < scaleMax) {
            const value = Math.floor(scale);
            return `${value} ${scaleName}${value > 1 ? "s" : ""} ago`;
        }
    }

    return "a long time ago";
};

export const getBrowserTimezone = () =>
    Intl.DateTimeFormat().resolvedOptions().timeZone;
