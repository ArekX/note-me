import { signal, useComputed } from "@preact/signals";
import { addMessage } from "$frontend/toast-message.ts";
import { restore, store } from "$frontend/session-storage.ts";
import { useEffect } from "preact/hooks";
import { decodeBase64, encodeBase64 } from "$frontend/deps.ts";

export const UNLOCK_DURATION_MINUTES = 15;

interface PendingRequest {
    resolve: (password: string) => void;
    reject: () => void;
}

interface EncryptionLockState {
    userPassword: string | null;
    lockAt: number | null;
}

// Important: These algorithms are not secure and they are only used to store the user's password without it being in
// plain text in the localStorage. It should not be used for any other purpose.
const encrypt = (password: string, key: number): string => {
    let encryptedText = "";
    const effectiveKey = key % 65535;
    for (let i = 0; i < password.length; i++) {
        const charCode = password.charCodeAt(i);
        encryptedText += String.fromCharCode((charCode + effectiveKey) % 65535);
    }
    return encodeBase64(new TextEncoder().encode(encryptedText));
};

const decrypt = (encryptedPassword: string, key: number): string => {
    const cipherText = new TextDecoder().decode(
        decodeBase64(encryptedPassword),
    );
    let decryptedText = "";
    const effectiveKey = key % 65535;
    for (let i = 0; i < cipherText.length; i++) {
        const charCode = cipherText.charCodeAt(i);
        decryptedText += String.fromCharCode(
            (charCode - effectiveKey + 65535) % 65535,
        );
    }
    return decryptedText;
};

const getInitialState = (): EncryptionLockState => {
    const { userPassword = null, lockAt = null } = restore<EncryptionLockState>(
        "encryptionLock",
        {
            userPassword: null,
            lockAt: null,
        },
    ) ?? {};

    if (
        lockAt === null ||
        lockAt < Date.now()
    ) {
        return {
            userPassword: null,
            lockAt: null,
        };
    }

    return {
        userPassword,
        lockAt,
    };
};

const initialState = getInitialState();

const isLockWindowOpen = signal(false);
const userPassword = signal<string | null>(
    initialState.userPassword
        ? decrypt(
            initialState.userPassword,
            initialState.lockAt ?? 1,
        )
        : null,
);

const pendingRequests = signal<PendingRequest[]>([]);

const lockAt = signal<number | null>(initialState.lockAt);

export const useEncryptionLock = () => {
    const storeState = () => {
        store<EncryptionLockState>("encryptionLock", {
            userPassword: userPassword.value
                ? encrypt(userPassword.value, lockAt.value ?? 1)
                : null,
            lockAt: lockAt.value,
        });
    };

    useEffect(() => {
        const handleStorage = (event: StorageEvent) => {
            if (event.storageArea !== globalThis.localStorage) {
                return;
            }

            const data = restore<EncryptionLockState>("encryptionLock");

            userPassword.value = data?.userPassword ?? null;
            lockAt.value = data?.lockAt ?? null;
        };

        globalThis.addEventListener("storage", handleStorage);

        return () => {
            globalThis.removeEventListener("storage", handleStorage);
        };
    }, []);

    useEffect(() => {
        if (lockAt.value === null) {
            return;
        }

        const timeout = setTimeout(lock, lockAt.value - Date.now());
        return () => clearTimeout(timeout);
    }, [lockAt.value]);

    const unlock = (password: string) => {
        userPassword.value = password;
        lockAt.value = Date.now() + 1000 * 60 * UNLOCK_DURATION_MINUTES;

        isLockWindowOpen.value = false;

        processPendingRequests((request) => request.resolve(password));

        addMessage({
            type: "success",
            text: "Protected notes are now unlocked.",
        });

        storeState();
    };

    const lock = () => {
        if (userPassword.value === null) {
            isLockWindowOpen.value = false;
            processPendingRequests((request) => request.reject());
            return;
        }

        if (!isLockWindowOpen.value) {
            addMessage({
                type: "info",
                text: "Protected notes are now locked.",
            });
        }

        isLockWindowOpen.value = false;
        userPassword.value = null;

        lockAt.value = null;

        processPendingRequests((request) => request.reject());
        storeState();
    };

    const processPendingRequests = (
        processCall: (p: PendingRequest) => void,
    ) => {
        for (const request of pendingRequests.value) {
            processCall(request);
        }
        pendingRequests.value = [];
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
