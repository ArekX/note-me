// localStorage cache for data that must not outlive a session: the note
// tree ("treeStorage") and the encryption lock state ("encryptionLock").
// It is wiped on the login page, on logout and on a forced logout.

export const store = <T>(key: string, value: T): void => {
    localStorage.setItem(key, JSON.stringify(value));
};

export const restore = <T>(key: string, defaultValue: T | null = null) => {
    const value = localStorage.getItem(key);
    if (value === null) {
        return defaultValue;
    }
    try {
        return JSON.parse(value) as T;
    } catch {
        return defaultValue;
    }
};

export const clearStorage = (): void => {
    localStorage.clear();
};
