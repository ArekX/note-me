import { ComponentChildren } from "preact";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import { useEncryptionLock } from "$frontend/hooks/use-encryption-lock.ts";
import Loader from "$islands/Loader.tsx";
import Button from "$components/Button.tsx";
import { useEffect } from "preact/hooks";
import { useSignal } from "@preact/signals";

interface ProtectedAreaWrapperProps {
    requirePassword: boolean;
    children?: ComponentChildren;
    onUnlock?: () => Promise<void>;
}

export default function ProtectedAreaWrapper(
    { children, requirePassword, onUnlock }: ProtectedAreaWrapperProps,
) {
    const encryptionLock = useEncryptionLock();
    const isFirstAttempt = useSignal(true);
    const requestFailReason = useSignal<string | null>(null);
    const lockLoader = useLoader(
        encryptionLock.isLocked.value && requirePassword,
    );

    const requestUnlock = lockLoader.wrap(async () => {
        isFirstAttempt.value = false;
        requestFailReason.value = null;
        if (!encryptionLock.isLocked.value) {
            await onUnlock?.();
            return;
        }

        try {
            await encryptionLock.requestPassword();
            await onUnlock?.();
        } catch (e) {
            if (e) {
                requestFailReason.value = e.message;
            }
        }
    });

    useEffect(() => {
        if (
            requirePassword && encryptionLock.isLocked.value &&
            !encryptionLock.isLockWindowOpen.value
        ) {
            if (isFirstAttempt.value) {
                requestUnlock();
            }
        } else if (requirePassword && onUnlock) {
            lockLoader.run(onUnlock);
        }
    }, [requirePassword, encryptionLock.isLocked.value]);

    return lockLoader.running
        ? (
            <Loader color="white">
                Waiting for protection unlock...
            </Loader>
        )
        : (
            <>
                {requirePassword && encryptionLock.isLocked.value
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
                                        Unlock
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )
                    : <div>{children}</div>}
            </>
        );
}
