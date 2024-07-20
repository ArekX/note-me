import { ComponentChildren } from "preact";
import { useEncryptionLock } from "$frontend/hooks/use-encryption-lock.ts";
import { useSignal } from "@preact/signals";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
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
    const decryptionFailed = useSignal(false);
    const decryptedText = useSignal(!isEncrypted ? encryptedText : "");
    const decryptionLoader = useLoader(isEncrypted);

    const { sendMessage } = useWebsocketService();

    const decryptNoteText = decryptionLoader.wrap(async () => {
        decryptionFailed.value = false;
        decryptedText.value = "";
        try {
            const encryptionPassword = await encryptionLock.requestPassword();

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
        } catch {
            decryptionFailed.value = true;
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
                        {decryptionFailed.value
                            ? (
                                <div>
                                    Protected notes cannot be viewed or edited
                                    without entering the password.

                                    <div class="py-2">
                                        <Button
                                            color="primary"
                                            onClick={decryptNoteText}
                                        >
                                            Unlock
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
