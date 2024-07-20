import Dialog from "$islands/Dialog.tsx";
import {
    UNLOCK_DURATION_MINUTES,
    useEncryptionLock,
} from "$frontend/hooks/use-encryption-lock.ts";
import Input from "$components/Input.tsx";
import { useSignal } from "@preact/signals";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import { useEffect } from "preact/hooks";

export default function EncryptionLockWindow() {
    const encryptionLock = useEncryptionLock();

    const password = useSignal("");

    const handleCancelLockWindow = () => encryptionLock.lock();

    const handleConfirmUnlock = () => encryptionLock.unlock(password.value);

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleConfirmUnlock();
        }
    };

    useEffect(() => {
        password.value = "";
    }, [encryptionLock.isLocked.value]);

    if (!encryptionLock.isLockWindowOpen.value) {
        return null;
    }

    return (
        <Dialog
            props={{ class: "w-2/3" }}
            visible={true}
            canCancel={true}
            onCancel={handleCancelLockWindow}
        >
            <div class="p-4 text-left">
                <h2 class="text-lg font-semibold">Encryption</h2>
                <p class="py-4">
                    Your notes are encrypted. To view them, please enter your
                    password.
                </p>

                <Input
                    type="password"
                    placeholder="Password"
                    label="Password"
                    value={password.value}
                    onInput={(value) => password.value = value}
                    onKeydown={handleKeyDown}
                />
                <p class="py-2">
                    <strong>Important:</strong>{" "}
                    After entering your password, all your protected notes will
                    be decrypted and available to anyone with access for next
                    {" "}
                    {UNLOCK_DURATION_MINUTES}{" "}
                    minutes or until you lock them again by clicking on the lock
                    icon.
                </p>
                <div class="text-right">
                    <Button
                        color="success"
                        onClick={handleConfirmUnlock}
                    >
                        <Icon name="lock-open-alt" type="solid" /> Unlock
                    </Button>
                    <Button
                        color="danger"
                        onClick={handleCancelLockWindow}
                        addClass="ml-2"
                    >
                        <Icon name="minus-circle" /> Cancel
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
