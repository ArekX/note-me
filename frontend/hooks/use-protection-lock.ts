import { signal } from "@preact/signals";
import { decodeBase64, encodeBase64 } from "$frontend/deps.ts";
import { restore, store } from "$frontend/session-storage.ts";
import { IS_BROWSER } from "$fresh/runtime.ts";
import { addMessage } from "$frontend/toast-message.ts";

const ADD_LOCK_TIMEOUT = 1000 * 10; // * 5;

const userPassword = signal<string | null>(null);
const lockAt = signal<number | null>(null);
const startAt = signal<number | null>(null);
const isUnlockRequested = signal(false);
const pendingRequests = signal<PendingRequest[]>([]);

interface EncryptionLockState {
    startAt: number | null;
    userPassword: string | null;
    lockAt: number | null;
}

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
    if (!IS_BROWSER) {
        return {
            userPassword: null,
            lockAt: null,
            startAt: null,
        };
    }

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

const storeState = () => {
    store<EncryptionLockState>("encryptionLock", {
        userPassword: userPassword.value
            ? encrypt(userPassword.value, startAt.value ?? 1)
            : null,
        lockAt: lockAt.value,
        startAt: startAt.value,
    });
};

export const initializeProtectionLock = () => {
    const state = getInitialState();

    if (state.userPassword) {
        userPassword.value = decrypt(state.userPassword, state.startAt ?? 0);
    }

    lockAt.value = state.lockAt;
    startAt.value = state.startAt;

    setInterval(() => {
        if (lockAt.value && lockAt.value < Date.now()) {
            userPassword.value = null;
            lockAt.value = null;
            startAt.value = null;
            storeState();

            addMessage({
                type: "info",
                text: "Protected notes have been locked due to inactivity.",
            });
        }
    }, 1000);

    const resetIdleTimer = () => {
        if (lockAt.value) {
            lockAt.value = Date.now() + ADD_LOCK_TIMEOUT;
            storeState();
        }
    };

    addEventListener("mousemove", resetIdleTimer);
    addEventListener("keydown", resetIdleTimer);
    addEventListener("scroll", resetIdleTimer);
    addEventListener("click", resetIdleTimer);
};

interface PendingRequest {
    resolve: (password: string) => void;
    reject: (reason: string) => void;
}

export type ProtectionLockHook = ReturnType<typeof useProtectionLock>;

export const useProtectionLock = () => {
    const requestUnlock = () =>
        new Promise<string | null>((resolve, reject) => {
            if (userPassword.value) {
                resolve(userPassword.value);
                return;
            }

            isUnlockRequested.value = true;
            pendingRequests.value = [...pendingRequests.value, {
                resolve,
                reject,
            }];
        });

    const resolveUnlockRequest = (password: string) => {
        userPassword.value = password;
        lockAt.value = Date.now() + ADD_LOCK_TIMEOUT;
        startAt.value = Date.now();
        isUnlockRequested.value = false;

        pendingRequests.value.forEach((request) => {
            request.resolve(password);
        });
        pendingRequests.value = [];

        storeState();
    };

    const rejectUnlockRequest = (reason: string) => {
        isUnlockRequested.value = false;
        pendingRequests.value.forEach((request) => request.reject(reason));
        pendingRequests.value = [];
    };

    const lock = () => {
        userPassword.value = null;
        isUnlockRequested.value = false;
        lockAt.value = null;
        startAt.value = null;
        storeState();
    };

    const isLocked = () => userPassword.value === null;

    return {
        isUnlockRequested,
        isLocked,
        requestUnlock,
        resolveUnlockRequest,
        rejectUnlockRequest,
        lock,
    };
};
