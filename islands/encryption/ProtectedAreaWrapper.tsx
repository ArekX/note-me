import { ComponentChildren } from "preact";
import { LoaderHook, useLoader } from "$frontend/hooks/use-loader.ts";
import Loader from "$islands/Loader.tsx";
import Button from "$components/Button.tsx";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { useProtectionLock } from "$frontend/hooks/use-protection-lock.ts";

interface ProtectedAreaWrapperProps {
    loader?: LoaderHook;
    requirePassword: boolean;
    children?: ComponentChildren;
    onUnlock?: () => Promise<void>;
}

export default function ProtectedAreaWrapper(
    { children, requirePassword, onUnlock, loader }: ProtectedAreaWrapperProps,
) {
    const encryptionLock = useProtectionLock();
    const isUnlocked = useSignal(
        !encryptionLock.isLocked() || !requirePassword,
    );
    const requestFailReason = useSignal<string | null>(null);
    const lockLoader = useLoader(false);

    const requestUnlock = lockLoader.wrap(async () => {
        requestFailReason.value = null;
        try {
            await encryptionLock.requestUnlock();
            await onUnlock?.();
            isUnlocked.value = true;
        } catch (e) {
            if (e) {
                requestFailReason.value = e.message;
            }
        }
    });

    useEffect(() => {
        const isUnlockedNow = !requirePassword ||
            !encryptionLock.isLocked();

        if (!isUnlocked.value && isUnlockedNow) {
            onUnlock?.();
        }

        isUnlocked.value = isUnlockedNow;
    }, [requirePassword, encryptionLock.isLocked()]);

    return lockLoader.running || (loader?.running ?? false)
        ? (
            <Loader color="white">
                Waiting for protection unlock...
            </Loader>
        )
        : (
            <>
                {!isUnlocked.value
                    ? (
                        <div>
                            <div>
                                <div class="text-2xl font-semibold py-2">
                                    Password is required for this area.
                                </div>

                                This area contains password protected content
                                which cannot be managed without entering the
                                password.

                                {requestFailReason.value && (
                                    <div class="text-red-500 py-2">
                                        Fail reason: {requestFailReason.value}
                                    </div>
                                )}

                                <div class="py-2">
                                    <Button
                                        color="success"
                                        onClick={requestUnlock}
                                    >
                                        {requestFailReason.value !== null
                                            ? "Retry"
                                            : "Unlock"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )
                    : <div>{children}</div>}
            </>
        );
}
