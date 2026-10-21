const timeAgoScale: [number, string, number][] = [
    [60, "minute", 60],
    [60, "hour", 24],
    [24, "day", 30],
    [30, "month", 12],
    [12, "year", 100],
];

export const timeAgo = (from: number | Date, now = new Date()): string => {
    const date = from instanceof Date ? from : new Date(from * 1000);
    let scale = (now.getTime() - date.getTime()) / 1000;
    const isFuture = scale < 0;
    scale = Math.abs(scale);

    if (scale < 60) {
        const unit = `second${scale > 1 ? "s" : ""}`;
        const value = Math.floor(scale);
        return isFuture ? `in ${value} ${unit}` : `${value} ${unit} ago`;
    }

    for (const [divisor, name, max] of timeAgoScale) {
        scale = scale / divisor;
        if (scale < max) {
            const value = Math.floor(scale);
            const unit = `${name}${value > 1 ? "s" : ""}`;
            return isFuture ? `in ${value} ${unit}` : `${value} ${unit} ago`;
        }
    }

    return isFuture ? "in far future" : "a long time ago";
};
