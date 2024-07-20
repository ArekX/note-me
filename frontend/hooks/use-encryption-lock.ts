import { signal, useComputed } from "@preact/signals";

export const UNLOCK_DURATION_MINUTES = 15;

interface PendingRequest {
    resolve: (password: string) => void;
    reject: () => void;
}

const isLockWindowOpen = signal(false);
const userPassword = signal<string | null>("");
const unlockedUntil = signal<Date | null>(null);
const pendingRequests = signal<PendingRequest[]>([]);

export const useEncryptionLock = () => {
    const isLocked = useComputed(() => {
        if (!unlockedUntil.value) {
            return true;
        }

        return unlockedUntil.value < new Date();
    });

    const unlock = (password: string) => {
        userPassword.value = password;
        unlockedUntil.value = new Date(
            Date.now() + 1000 * 60 * UNLOCK_DURATION_MINUTES,
        );
        isLockWindowOpen.value = false;

        for (const request of pendingRequests.value) {
            request.resolve(password);
        }

        pendingRequests.value = [];
    };

    const lock = () => {
        isLockWindowOpen.value = false;
        userPassword.value = null;
        unlockedUntil.value = null;

        for (const request of pendingRequests.value) {
            request.reject();
        }

        pendingRequests.value = [];
    };

    const requestPassword = () =>
        new Promise<string>((resolve, reject) => {
            if (isLocked.value) {
                pendingRequests.value = [...pendingRequests.value, {
                    resolve,
                    reject,
                }];
                isLockWindowOpen.value = true;
                return;
            }

            resolve(userPassword.value!);
        });

    return {
        isLockWindowOpen,
        isLocked,
        unlock,
        lock,
        requestPassword,
    };
};
