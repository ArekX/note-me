export const dateToYmd = (date: Date) => date.toISOString().split("T")[0];

export const dateToHms = (date: Date) =>
    date.toISOString().split("T")[1].split(".")[0];
