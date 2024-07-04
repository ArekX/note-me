export const unixToDate = (unix: number) => new Date(unix * 1000);

export const dateToUnix = (date: Date) => Math.floor(date.getTime() / 1000);

export const inputDateToUnix = (date: string) => dateToUnix(new Date(date));

export const dateToYmd = (date: Date) => date.toISOString().split("T")[0];

export const dateToHms = (date: Date) =>
    date.toISOString().split("T")[1].split(".")[0];

export const getDateWithAddedDays = (
    addDays: number = 1,
    date: Date | null = null,
) => {
    const nextDay = date ? new Date(date) : new Date();
    nextDay.setDate(nextDay.getDate() + addDays);
    return nextDay;
};

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
        return isFuture ? "soon" : "just now";
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

export const getBrowserTimezone = () =>
    Intl.DateTimeFormat().resolvedOptions().timeZone;
