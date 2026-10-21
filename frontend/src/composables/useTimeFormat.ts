import { resolveTimeZone } from "@/lib/time-zone";

const toDate = (date: Date | number) =>
    typeof date === "number" ? new Date(date * 1000) : date;

// Browser timezone, as the original; the profile timezone is only used for
// scheduling (decision 0.36).
export const useTimeFormat = () => {
    const timeZone = resolveTimeZone();

    const dateTime = new Intl.DateTimeFormat(undefined, {
        timeStyle: "medium",
        dateStyle: "medium",
        timeZone,
    });
    const date = new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeZone,
    });
    const time = new Intl.DateTimeFormat(undefined, {
        timeStyle: "medium",
        timeZone,
    });
    const iso = new Intl.DateTimeFormat("en-US", {
        hour12: false,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone,
    });

    const isoPart = (
        value: Date | number,
        type: Intl.DateTimeFormatPartTypes,
    ) =>
        iso.formatToParts(toDate(value)).find((part) => part.type === type)
            ?.value;

    return {
        formatIsoDate: (value: Date | number) =>
            `${isoPart(value, "year")}-${isoPart(value, "month")}-${isoPart(value, "day")}`,
        formatIsoTime: (value: Date | number) =>
            `${isoPart(value, "hour")}:${isoPart(value, "minute")}:${isoPart(value, "second")}`,
        formatDate: (value: Date | number) => date.format(toDate(value)),
        formatTime: (value: Date | number) => time.format(toDate(value)),
        formatDateTime: (value: Date | number) =>
            dateTime.format(toDate(value)),
    };
};
