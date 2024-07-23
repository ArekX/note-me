export const store = <T>(key: string, value: T) => {
    localStorage.setItem(key, JSON.stringify(value));
};

export const restore = <T>(key: string, defaultValue: T | null = null) => {
    const value = localStorage.getItem(key);

    try {
        return JSON.parse(value!) as T;
    } catch {
        return defaultValue;
    }
};

export const clearStorage = () => {
    localStorage.clear();
};
