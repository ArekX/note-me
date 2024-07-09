export const addDays = (
    addDays: number = 1,
    date: Date | null = null,
) => {
    const nextDay = date ? new Date(date) : new Date();
    nextDay.setDate(nextDay.getDate() + addDays);
    return nextDay;
};
