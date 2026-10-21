import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
    PROTECTION_LOCK_IDLE_MS,
    obfuscatePassword,
    revealPassword,
    useProtectionLockStore,
} from "./protection-lock";
import { useToastStore } from "./toast";

describe("protection lock store", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        localStorage.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("obfuscates the stored password reversibly", () => {
        const value = obfuscatePassword("pässwörd", 1234567);
        expect(value).not.toContain("pässwörd");
        expect(revealPassword(value, 1234567)).toBe("pässwörd");
    });

    // The old character shift turned "s" into a lone surrogate with this key.
    it("reveals the password for every key", () => {
        for (const key of [0xd800 - "s".charCodeAt(0), 1792570000123, 255]) {
            expect(
                revealPassword(obfuscatePassword("secret ✓", key), key),
            ).toBe("secret ✓");
        }
    });

    it("starts locked with a password stored in the old format", () => {
        const startAt = Date.now();
        localStorage.setItem(
            "encryptionLock",
            JSON.stringify({
                userPassword: btoa("tfdsfu"),
                lockAt: startAt + PROTECTION_LOCK_IDLE_MS,
                startAt,
            }),
        );
        const lock = useProtectionLockStore();
        lock.init();
        expect(lock.isLocked).toBe(true);
    });

    it("waits for the password and hands it to every pending request", async () => {
        const lock = useProtectionLockStore();
        const first = lock.requestUnlock();
        const second = lock.requestUnlock();
        expect(lock.isUnlockRequested).toBe(true);

        lock.resolveUnlockRequest("secret");
        await expect(first).resolves.toBe("secret");
        await expect(second).resolves.toBe("secret");
        expect(lock.isLocked).toBe(false);
        await expect(lock.requestUnlock()).resolves.toBe("secret");

        const stored = JSON.parse(localStorage.getItem("encryptionLock")!);
        expect(stored.userPassword).not.toBe("secret");
        expect(revealPassword(stored.userPassword, stored.startAt)).toBe(
            "secret",
        );
    });

    it("rejects pending requests on cancel", async () => {
        const lock = useProtectionLockStore();
        const request = lock.requestUnlock();
        lock.rejectUnlockRequest("User cancelled password entry.");
        await expect(request).rejects.toBe("User cancelled password entry.");
        expect(lock.isUnlockRequested).toBe(false);
    });

    it("locks after five idle minutes and activity extends the time", () => {
        const lock = useProtectionLockStore();
        lock.init();
        lock.resolveUnlockRequest("secret");

        vi.advanceTimersByTime(PROTECTION_LOCK_IDLE_MS - 1000);
        dispatchEvent(new Event("keydown"));
        vi.advanceTimersByTime(PROTECTION_LOCK_IDLE_MS - 1000);
        expect(lock.isLocked).toBe(false);

        vi.advanceTimersByTime(2000);
        expect(lock.isLocked).toBe(true);
        expect(useToastStore().messages.at(-1)?.text).toBe(
            "Protected notes have been locked due to inactivity.",
        );
        expect(
            JSON.parse(localStorage.getItem("encryptionLock")!).userPassword,
        ).toBeNull();
    });

    it("restores only an unexpired lock from storage", () => {
        const startAt = Date.now();
        const save = (lockAt: number) =>
            localStorage.setItem(
                "encryptionLock",
                JSON.stringify({
                    userPassword: obfuscatePassword("secret", startAt),
                    lockAt,
                    startAt,
                }),
            );

        save(startAt + 1000);
        const lock = useProtectionLockStore();
        lock.init();
        expect(lock.isLocked).toBe(false);

        setActivePinia(createPinia());
        save(startAt - 1000);
        const expired = useProtectionLockStore();
        expired.init();
        expect(expired.isLocked).toBe(true);
    });
});
