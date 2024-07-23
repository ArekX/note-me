import { ComponentChildren } from "preact";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import Loader from "$islands/Loader.tsx";
import Button from "$components/Button.tsx";
import { NoteTextHook } from "$islands/notes/hooks/use-note-text.ts";
import { useEffect } from "preact/hooks";
import { useEncryptionLock } from "$frontend/hooks/use-encryption-lock.ts";

interface EncryptionNoteWrapperProps {
    noteText: NoteTextHook;
    onDecrypt?: (text: string) => void;
    children: ComponentChildren;
}

export default function EncryptionNoteWrapper({
    noteText,
    onDecrypt,
    children,
}: EncryptionNoteWrapperProps) {
    const encryptionLock = useEncryptionLock();
    const decryptionLoader = useLoader(!noteText.isResolved());

    const handleDecrypt = decryptionLoader.wrap(async () => {
        if (encryptionLock.isLocked.value) {
            noteText.clearResolvedText();
        }

        const result = await noteText.getText();
        if (result) {
            onDecrypt?.(result);
        }
    });

    useEffect(() => {
        if (!noteText.isResolved()) {
            handleDecrypt();
        } else {
            decryptionLoader.stop();
        }
    }, [noteText]);

    const isAreaLocked = noteText.isEncrypted() &&
            encryptionLock.isLocked.value ||
        noteText.getFailReason();

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
                        {isAreaLocked
                            ? (
                                <div>
                                    <div class="text-2xl font-semibold py-2">
                                        Password protected area
                                    </div>

                                    Protected notes cannot be viewed or edited
                                    without entering the password.

                                    {noteText.getFailReason() && (
                                        <div class="py-2 font-semibold text-lg">
                                            Fail reason:{" "}
                                            {noteText.getFailReason()}
                                        </div>
                                    )}

                                    <div class="py-2">
                                        <Button
                                            color="success"
                                            onClick={handleDecrypt}
                                        >
                                            {noteText.getFailReason()
                                                ? "Retry"
                                                : "Unlock"}
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
