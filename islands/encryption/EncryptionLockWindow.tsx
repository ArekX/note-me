import Dialog from "$islands/Dialog.tsx";

import Input from "$components/Input.tsx";
import { useSignal } from "@preact/signals";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import { useEffect } from "preact/hooks";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    VerifyOwnPasswordMessage,
    VerifyOwnPasswordResponse,
} from "$workers/websocket/api/users/messages.ts";
import Loader from "$islands/Loader.tsx";
import { ProtectionLockHook } from "../../frontend/hooks/use-protection-lock.ts";

interface EncryptionLockWindowProps {
    lock: ProtectionLockHook;
}

export default function EncryptionLockWindow({
    lock,
}: EncryptionLockWindowProps) {
    const isInvalidPassword = useSignal(false);

    const loader = useLoader();

    const { sendMessage } = useWebsocketService();

    const password = useSignal("");

    const handleCancelLockWindow = () =>
        lock.rejectUnlockRequest("User cancelled password entry.");

    const handleConfirmUnlock = loader.wrap(async () => {
        const response = await sendMessage<
            VerifyOwnPasswordMessage,
            VerifyOwnPasswordResponse
        >(
            "users",
            "verifyOwnPassword",
            {
                data: {
                    password: password.value,
                },
                expect: "verifyOwnPasswordResponse",
            },
        );

        if (!response.verified) {
            isInvalidPassword.value = true;
            return;
        }

        lock.resolveUnlockRequest(password.value);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleConfirmUnlock();
        }
    };

    useEffect(() => {
        password.value = "";
        isInvalidPassword.value = false;
    }, [lock.isLocked()]);

    return (
        <Dialog
            props={{ class: "w-2/5" }}
            visible={true}
            canCancel={true}
            onCancel={handleCancelLockWindow}
        >
            <div class="p-4 text-left">
                <h2 class="text-lg font-semibold">Unlock Protected Notes</h2>
                <p class="py-4">
                    In order to view protected notes, please enter your
                    password.
                </p>

                {loader.running
                    ? <Loader color="white">Validating...</Loader>
                    : (
                        <div>
                            <Input
                                type="password"
                                placeholder="Password"
                                label="Password"
                                value={password.value}
                                onInput={(value) => password.value = value}
                                onKeydown={handleKeyDown}
                            />
                            {isInvalidPassword.value && (
                                <p class="text-red-500 py-2">
                                    Invalid password. Please try again.
                                </p>
                            )}
                            <p class="py-2">
                                <strong>Important:</strong>{" "}
                                After entering your password, all your protected
                                notes will be decrypted viewable unless idle for
                                5 minutes or until you lock them again by
                                clicking on the lock icon.
                            </p>
                            <div class="text-right">
                                <Button
                                    color="success"
                                    onClick={handleConfirmUnlock}
                                >
                                    <Icon name="lock-open-alt" type="solid" />
                                    {" "}
                                    Unlock
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
                    )}
            </div>
        </Dialog>
    );
}
