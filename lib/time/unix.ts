export const unixToDate = (unix: number) => new Date(unix * 1000);

export const dateToUnix = (date: Date) => Math.floor(date.getTime() / 1000);

export const inputDateToUnix = (date: string) => dateToUnix(new Date(date));

export const getCurrentUnixTimestamp = () => Math.floor(Date.now() / 1000);
