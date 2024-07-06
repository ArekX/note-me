import { useComputed } from "@preact/signals";
import { userData } from "$frontend/hooks/use-user.ts";
import { unixToDate } from "$frontend/time.ts";

export const useTimeFormat = () => {
    const formatters = useComputed(() => {
        const timeZoneData = {
            timeZone: userData.value?.timezone ??
                Intl.DateTimeFormat().resolvedOptions().timeZone,
        };

        return {
            dateTime: new Intl.DateTimeFormat(undefined, {
                timeStyle: "medium",
                dateStyle: "medium",
                ...timeZoneData,
            }),
            date: new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
                ...timeZoneData,
            }),
            time: new Intl.DateTimeFormat(undefined, {
                timeStyle: "medium",
                ...timeZoneData,
            }),
            iso: new Intl.DateTimeFormat("en-US", {
                hour12: false,
                hourCycle: "h23",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                ...timeZoneData,
            }),
        };
    });

    const resolveDate = (date: Date | number): Date => {
        if (typeof date === "number") {
            return unixToDate(date);
        }
        return date;
    };

    const formatIsoDate = (date: Date | number): string => {
        date = resolveDate(date);
        const parts = formatters.value.iso.formatToParts(date);

        const year = parts.find((part) => part.type === "year")?.value;
        const month = parts.find((part) => part.type === "month")?.value;
        const day = parts.find((part) => part.type === "day")?.value;

        return `${year}-${month}-${day}`;
    };

    const formatIsoTime = (date: Date | number): string => {
        date = resolveDate(date);
        const parts = formatters.value.iso.formatToParts(date);

        const hour = parts.find((part) => part.type === "hour")?.value;
        const minute = parts.find((part) => part.type === "minute")?.value;
        const second = parts.find((part) => part.type === "second")?.value;

        return `${hour}:${minute}:${second}`;
    };

    const formatDate = (date: Date | number): string => {
        date = resolveDate(date);
        return formatters.value.date.format(date);
    };

    const formatTime = (date: Date | number): string => {
        date = resolveDate(date);
        return formatters.value.time.format(date);
    };

    const formatDateTime = (date: Date | number): string => {
        date = resolveDate(date);
        return formatters.value.dateTime.format(date);
    };

    return {
        formatIsoDate,
        formatIsoTime,
        formatDate,
        formatTime,
        formatDateTime,
    };
};
