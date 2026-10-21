export const validateDateTime = (date: string, time: string): string[] => {
    if (date.length === 0 || time.length === 0) {
        return ["Please enter reminder date."];
    }
    if (Date.now() - new Date(`${date} ${time}`).getTime() > 0) {
        return ["Reminder date is in the past."];
    }
    return [];
};

export const validateRepeat = (interval: number, repeat: number): string[] => {
    const errors: string[] = [];
    if (isNaN(interval)) {
        errors.push("Please enter a valid number for interval.");
    }
    if (isNaN(repeat)) {
        errors.push("Please enter a valid number for repeat.");
    }
    if (interval <= 0) {
        errors.push("Please enter a positive number for interval.");
    }
    if (repeat <= 0) {
        errors.push("Please enter a positive number for repeat.");
    }
    return errors;
};
