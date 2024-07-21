import { ComponentChildren } from "preact";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import { useEncryptionLock } from "$frontend/hooks/use-encryption-lock.ts";
import Loader from "$islands/Loader.tsx";
import Button from "$components/Button.tsx";
import { useEffect } from "preact/hooks";

interface ProtectedAreaWrapperProps {
    requirePassword: boolean;
    children?: ComponentChildren;
    onUnlock?: () => void;
}

export default function ProtectedAreaWrapper(
    { children, requirePassword, onUnlock }: ProtectedAreaWrapperProps,
) {
    const encryptionLock = useEncryptionLock();
    const lockLoader = useLoader(
        encryptionLock.isLocked.value && requirePassword,
    );

    const requestUnlock = lockLoader.wrap(async () => {
        if (!encryptionLock.isLocked.value) {
            onUnlock?.();
            return;
        }

        try {
            await encryptionLock.requestPassword();
            onUnlock?.();
        } catch {
            // Ignore
        }
    });

    useEffect(() => {
        if (!requirePassword || !encryptionLock.isLocked.value) {
            requestUnlock();
        }
    }, [requirePassword, encryptionLock.isLocked.value]);

    useEffect(() => {
        if (requirePassword && encryptionLock.isLocked.value) {
            requestUnlock();
        }
    }, []);

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
