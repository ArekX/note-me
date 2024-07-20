import { signal, useComputed } from "@preact/signals";
import { addMessage } from "$frontend/toast-message.ts";

export const UNLOCK_DURATION_MINUTES = 15;

interface PendingRequest {
    resolve: (password: string) => void;
    reject: () => void;
}

const isLockWindowOpen = signal(false);
const userPassword = signal<string | null>(null);
const pendingRequests = signal<PendingRequest[]>([]);
const unlockTimeoutId = signal<number | null>(null);

export const useEncryptionLock = () => {
    const unlock = (password: string) => {
        userPassword.value = password;
        clearTimeout(unlockTimeoutId.value!);

        unlockTimeoutId.value = setTimeout(
            lock,
            1000 * 60 * UNLOCK_DURATION_MINUTES,
        );

        isLockWindowOpen.value = false;

        for (const request of pendingRequests.value) {
            request.resolve(password);
        }

        pendingRequests.value = [];

        addMessage({
            type: "success",
            text: "Protected notes are now unlocked.",
        });
    };

    const lock = () => {
        isLockWindowOpen.value = false;
        userPassword.value = null;

        for (const request of pendingRequests.value) {
            request.reject();
        }

        pendingRequests.value = [];

        addMessage({
            type: "info",
            text: "Protected notes are now locked.",
        });
    };

    const isLocked = useComputed(() => userPassword.value === null);

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
