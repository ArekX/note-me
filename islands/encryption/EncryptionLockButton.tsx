import { useEncryptionLock } from "$frontend/hooks/use-encryption-lock.ts";
import Icon from "$components/Icon.tsx";
import EncryptionLockWindow from "$islands/encryption/EncryptionLockWindow.tsx";

export default function EncryptionLockButton() {
    const lock = useEncryptionLock();

    const handleUnlock = () => {
        if (lock.isLocked.value) {
            lock.requestPassword().catch(() => {});
            return;
        }

        lock.lock();
    };

    return (
        <>
            <a
                class="hover:text-gray-300 cursor-pointer"
                title={lock.isLocked.value ? "Unlock" : "Lock"}
                onClick={handleUnlock}
            >
                <Icon
                    type={lock.isLocked.value ? "solid" : "regular"}
                    name={lock.isLocked.value ? "lock-alt" : "lock-open-alt"}
                />
            </a>
            <EncryptionLockWindow />
        </>
    );
}
