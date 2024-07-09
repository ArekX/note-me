import { dateToUnix } from "$lib/time/unix.ts";

export const startOfNextDay = (currentTime: number) => {
    const date = new Date(currentTime * 1000);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 1);
    return dateToUnix(date);
};

export const nextMinute = (currentTime: number) => {
    const date = new Date(currentTime * 1000);
    date.setMinutes(date.getMinutes() + 1);
    date.setSeconds(0);
    return dateToUnix(date);
};
