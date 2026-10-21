import { useProtectionLockStore } from "@/stores/protection-lock";
import { useToastStore } from "@/stores/toast";

export const useProtectionToggle = () => {
    const protectionLock = useProtectionLockStore();
    const toastStore = useToastStore();

    return async () => {
        if (!protectionLock.isLocked) {
            protectionLock.lock();
            toastStore.addMessage({
                type: "info",
                text: "Protected notes are now locked.",
            });
            return;
        }

        try {
            await protectionLock.requestUnlock();
            toastStore.addMessage({
                type: "success",
                text: "Protected notes are now unlocked.",
            });
        } catch {
            // Cancelled in the unlock window.
        }
    };
};
