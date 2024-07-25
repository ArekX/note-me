import { signal, useComputed } from "@preact/signals";
import { addMessage } from "$frontend/toast-message.ts";
import { restore, store } from "$frontend/session-storage.ts";
import { useEffect } from "preact/hooks";
import { decodeBase64, encodeBase64 } from "$frontend/deps.ts";
import { useIdleEffect } from "./use-idle-effect.ts";

export const UNLOCK_DURATION_MINUTES = 15;

interface PendingRequest {
    resolve: (password: string) => void;
    reject: () => void;
}

interface EncryptionLockState {
    startAt: number | null;
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
    const { userPassword = null, lockAt = null, startAt = null } =
        restore<EncryptionLockState>(
            "encryptionLock",
            {
                userPassword: null,
                lockAt: null,
                startAt: null,
            },
        ) ?? {};

    if (
        lockAt === null ||
        lockAt < Date.now()
    ) {
        return {
            userPassword: null,
            lockAt: null,
            startAt: null,
        };
    }

    return {
        userPassword,
        lockAt,
        startAt,
    };
};

const initialState = getInitialState();

const isLockWindowOpen = signal(false);
const userPassword = signal<string | null>(
    initialState.userPassword
        ? decrypt(
            initialState.userPassword,
            initialState.startAt ?? 1,
        )
        : null,
);

const pendingRequests = signal<PendingRequest[]>([]);

const lockAt = signal<number | null>(initialState.lockAt);
const startAt = signal<number | null>(initialState.startAt);

interface EncryptionLockOptions {
    onLock?: () => void;
}

export const useEncryptionLock = ({
    onLock,
}: EncryptionLockOptions = {}) => {
    const storeState = () => {
        store<EncryptionLockState>("encryptionLock", {
            userPassword: userPassword.value
                ? encrypt(userPassword.value, startAt.value ?? 1)
                : null,
            lockAt: lockAt.value,
            startAt: startAt.value,
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
            startAt.value = data?.startAt ?? null;
        };

        globalThis.addEventListener("storage", handleStorage);

        return () => {
            globalThis.removeEventListener("storage", handleStorage);
        };
    }, []);

    useEffect(() => {
        if (userPassword.value === null) {
            onLock?.();
        }
    }, [userPassword.value]);

    useIdleEffect(
        () => {
            if (lockAt.value === null) {
                return;
            }

            lock();
        },
        lockAt.value ? lockAt.value - Date.now() : null,
    );

    const unlock = (password: string) => {
        userPassword.value = password;
        lockAt.value = Date.now() + 1000 * 60 * UNLOCK_DURATION_MINUTES;
        startAt.value = Date.now();

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
        startAt.value = null;

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
