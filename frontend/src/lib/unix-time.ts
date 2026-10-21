export const toUnix = (date: Date) => Math.floor(date.getTime() / 1000);

export const nowUnix = () => toUnix(new Date());
