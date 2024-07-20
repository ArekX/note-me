import { ComponentChildren } from "preact";
import { useEncryptionLock } from "$frontend/hooks/use-encryption-lock.ts";
import { useSignal } from "@preact/signals";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import {
    SystemErrorMessage,
    useWebsocketService,
} from "$frontend/hooks/use-websocket-service.ts";
import {
    DecryptTextMessage,
    DecryptTextResponse,
} from "$workers/websocket/api/users/messages.ts";
import { useEffect } from "preact/hooks";
import Loader from "$islands/Loader.tsx";
import Button from "$components/Button.tsx";

interface EncryptionNoteWrapperProps {
    encryptedText: string;
    isEncrypted: boolean;
    onDecrypt: (text: string) => void;
    children: ComponentChildren;
}

export default function EncryptionNoteWrapper({
    encryptedText,
    isEncrypted,
    onDecrypt,
    children,
}: EncryptionNoteWrapperProps) {
    const encryptionLock = useEncryptionLock();
    const decryptionFailReason = useSignal<string | null>(null);
    const decryptedText = useSignal(!isEncrypted ? encryptedText : "");
    const decryptionLoader = useLoader(isEncrypted);

    const { sendMessage } = useWebsocketService();

    const decryptNoteText = decryptionLoader.wrap(async () => {
        decryptionFailReason.value = null;
        decryptedText.value = "";
        let encryptionPassword;
        try {
            encryptionPassword = await encryptionLock.requestPassword();
        } catch {
            decryptionFailReason.value = "Password request canceled.";
            return;
        }
        try {
            const response = await sendMessage<
                DecryptTextMessage,
                DecryptTextResponse
            >("users", "decryptText", {
                data: {
                    encrypted: encryptedText,
                    password: encryptionPassword!,
                },
                expect: "decryptTextResponse",
            });

            decryptedText.value = response.text;
            onDecrypt(response.text);
        } catch (e) {
            const error = e as SystemErrorMessage;
            decryptionFailReason.value =
                `Failed to decrypt: ${error.data.message}`;
        }
    });

    useEffect(() => {
        if (!isEncrypted || encryptedText === decryptedText.value) {
            return;
        }

        decryptNoteText();
    }, [encryptedText, isEncrypted]);

    return (
        <>
            {decryptionLoader.running
                ? (
                    <Loader color="white">
                        Waiting for protection unlock...
                    </Loader>
                )
                : (
                    <>
                        {decryptionFailReason.value
                            ? (
                                <div>
                                    <div class="text-2xl font-semibold py-2">
                                        Could not unlock note
                                    </div>

                                    Protected notes cannot be viewed or edited
                                    without entering the password.

                                    <div class="py-2 font-semibold text-lg">
                                        Fail reason:{" "}
                                        {decryptionFailReason.value}
                                    </div>

                                    <div class="py-2">
                                        <Button
                                            color="success"
                                            onClick={decryptNoteText}
                                        >
                                            Retry
                                        </Button>
                                    </div>
                                </div>
                            )
                            : children}
                    </>
                )}
        </>
    );
}
