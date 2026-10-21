import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { restore, store } from "@/lib/local-storage";
import { useToastStore } from "./toast";

export const PROTECTION_LOCK_IDLE_MS = 5 * 60 * 1000;
const STORAGE_KEY = "encryptionLock";

interface EncryptionLockState {
    userPassword: string | null;
    lockAt: number | null;
    startAt: number | null;
}

interface PendingRequest {
    resolve: (password: string) => void;
    reject: (reason: string) => void;
}

// Obfuscation only, as in the original: the password is shifted by startAt so
// it is not readable at a glance in localStorage. It is not encryption. The
// UTF-8 bytes are shifted, not the characters: a shifted character could land
// on a lone surrogate, which the encoder replaces, so the password was lost.
const FORMAT_PREFIX = "b1:";

const shiftBytes = (bytes: Uint8Array, key: number, direction: 1 | -1) =>
    bytes.map((byte) => (byte + direction * (key % 256) + 256) % 256);

export const obfuscatePassword = (password: string, key: number) =>
    FORMAT_PREFIX +
    btoa(
        String.fromCharCode(
            ...shiftBytes(new TextEncoder().encode(password), key, 1),
        ),
    );

// A value in the old character format is not trusted, so that session
// starts locked.
export const revealPassword = (value: string, key: number): string | null => {
    if (!value.startsWith(FORMAT_PREFIX)) {
        return null;
    }
    const bytes = Uint8Array.from(
        atob(value.slice(FORMAT_PREFIX.length)),
        (c) => c.charCodeAt(0),
    );
    return new TextDecoder().decode(shiftBytes(bytes, key, -1));
};

export const useProtectionLockStore = defineStore("protectionLock", () => {
    const userPassword = ref<string | null>(null);
    const lockAt = ref<number | null>(null);
    const startAt = ref<number | null>(null);
    const isUnlockRequested = ref(false);
    let pending: PendingRequest[] = [];

    const isLocked = computed(() => userPassword.value === null);

    const persist = () =>
        store<EncryptionLockState>(STORAGE_KEY, {
            userPassword: userPassword.value
                ? obfuscatePassword(userPassword.value, startAt.value ?? 1)
                : null,
            lockAt: lockAt.value,
            startAt: startAt.value,
        });

    const lock = () => {
        userPassword.value = null;
        lockAt.value = null;
        startAt.value = null;
        isUnlockRequested.value = false;
        persist();
    };

    const requestUnlock = () =>
        new Promise<string>((resolve, reject) => {
            if (userPassword.value) {
                resolve(userPassword.value);
                return;
            }
            isUnlockRequested.value = true;
            pending.push({ resolve, reject });
        });

    const resolveUnlockRequest = (password: string) => {
        userPassword.value = password;
        startAt.value = Date.now();
        lockAt.value = startAt.value + PROTECTION_LOCK_IDLE_MS;
        isUnlockRequested.value = false;
        persist();
        pending.forEach((request) => request.resolve(password));
        pending = [];
    };

    const rejectUnlockRequest = (reason: string) => {
        isUnlockRequested.value = false;
        pending.forEach((request) => request.reject(reason));
        pending = [];
    };

    const extend = () => {
        if (lockAt.value) {
            lockAt.value = Date.now() + PROTECTION_LOCK_IDLE_MS;
            persist();
        }
    };

    const checkIdle = () => {
        if (lockAt.value && lockAt.value < Date.now()) {
            lock();
            useToastStore().addMessage({
                type: "info",
                text: "Protected notes have been locked due to inactivity.",
            });
        }
    };

    let initialized = false;
    const init = () => {
        if (initialized) {
            return;
        }
        initialized = true;

        const saved = restore<EncryptionLockState>(STORAGE_KEY);
        const password =
            saved?.userPassword && saved.lockAt && saved.lockAt >= Date.now()
                ? revealPassword(saved.userPassword, saved.startAt ?? 1)
                : null;
        if (password) {
            userPassword.value = password;
            lockAt.value = saved!.lockAt;
            startAt.value = saved!.startAt;
        }

        setInterval(checkIdle, 1000);
        for (const event of ["mousemove", "keydown", "scroll", "click"]) {
            addEventListener(event, extend);
        }
    };

    return {
        isLocked,
        isUnlockRequested,
        init,
        lock,
        requestUnlock,
        resolveUnlockRequest,
        rejectUnlockRequest,
    };
});
