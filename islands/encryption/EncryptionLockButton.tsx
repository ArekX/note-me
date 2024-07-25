import Icon from "$components/Icon.tsx";
import EncryptionLockWindow from "$islands/encryption/EncryptionLockWindow.tsx";
import { useProtectionLock } from "../../frontend/hooks/use-protection-lock.ts";

export default function EncryptionLockButton() {
    const lock = useProtectionLock();

    const handleUnlock = () => {
        if (lock.isLocked()) {
            lock.requestUnlock();
            return;
        }

        lock.lock();
    };

    return (
        <>
            <a
                class="hover:text-gray-300 cursor-pointer"
                title={lock.isLocked() ? "Unlock" : "Lock"}
                onClick={handleUnlock}
            >
                <Icon
                    type={lock.isLocked() ? "solid" : "regular"}
                    name={lock.isLocked() ? "lock-alt" : "lock-open-alt"}
                />
            </a>
            {lock.isUnlockRequested.value && (
                <EncryptionLockWindow lock={lock} />
            )}
        </>
    );
}
