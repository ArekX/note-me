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
        };
    });

    const formatDate = (date: Date | number): string => {
        if (typeof date === "number") {
            date = unixToDate(date);
        }
        return formatters.value.date.format(date);
    };

    const formatTime = (date: Date | number): string => {
        if (typeof date === "number") {
            date = unixToDate(date);
        }
        return formatters.value.time.format(date);
    };

    const formatDateTime = (date: Date | number): string => {
        if (typeof date === "number") {
            date = unixToDate(date);
        }
        return formatters.value.dateTime.format(date);
    };

    return {
        formatDate,
        formatTime,
        formatDateTime,
    };
};
