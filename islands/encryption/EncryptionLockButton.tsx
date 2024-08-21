import Icon from "$components/Icon.tsx";
import { useProtectionLock } from "../../frontend/hooks/use-protection-lock.ts";
import { addMessage } from "$frontend/toast-message.ts";

export default function EncryptionLockButton() {
    const lock = useProtectionLock();

    const handleUnlock = () => {
        if (lock.isLocked.value) {
            lock.requestUnlock().then(() => {
                addMessage({
                    type: "success",
                    text: "Protected notes are now unlocked.",
                });
            });
            return;
        }

        lock.lock();
        addMessage({
            type: "info",
            text: "Protected notes are now locked.",
        });
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
                <span class="max-md:inline-block hidden pl-2">
                    {lock.isLocked.value ? "Locked" : "Unlocked"}
                </span>
            </a>
        </>
    );
}
