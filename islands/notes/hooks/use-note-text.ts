import { useEncryptionLock } from "$frontend/hooks/use-encryption-lock.ts";
import { ReadonlySignal, useComputed, useSignal } from "@preact/signals";
import {
    SystemErrorMessage,
    useWebsocketService,
} from "$frontend/hooks/use-websocket-service.ts";
import {
    DecryptTextMessage,
    DecryptTextResponse,
} from "$workers/websocket/api/users/messages.ts";

export type InputNoteData = {
    text: string;
    is_encrypted: boolean;
    is_resolved?: boolean;
};

interface NoteTextOptions {
    initialData?: InputNoteData;
    onLock?: () => void;
}

export interface NoteTextHook {
    isEncrypted: ReadonlySignal<boolean>;
    isResolved: ReadonlySignal<boolean>;
    needsUnlocking: ReadonlySignal<boolean>;
    getText: () => Promise<string | null>;
    setInputData: (record: InputNoteData) => void;
    getFailReason: () => string | null;
    clearResolvedText: () => void;
}

export const useNoteText = ({
    initialData = { text: "", is_encrypted: false },
    onLock,
}: NoteTextOptions = {}): NoteTextHook => {
    const encryptionLock = useEncryptionLock({
        onLock: () => {
            clearResolvedText();
            onLock?.();
        },
    });
    const { sendMessage } = useWebsocketService();
    const failReason = useSignal<string | null>(null);
    const textRecord = useSignal<InputNoteData>(initialData);
    const resolvedText = useSignal<string | null>(
        !initialData.is_encrypted || initialData.is_resolved
            ? initialData.text
            : null,
    );

    const setInputData = (record: InputNoteData) => {
        if (record.text === resolvedText.value) {
            return;
        }

        textRecord.value = record;

        failReason.value = null;
        if (!record.is_encrypted || record.is_resolved) {
            resolvedText.value = record.text;
        } else {
            resolvedText.value = null;
        }
    };

    const decryptText = async (text: string): Promise<string | null> => {
        let password;
        try {
            password = await encryptionLock.requestPassword();
        } catch {
            failReason.value = "Password enter cancelled.";
            return null;
        }

        try {
            const response = await sendMessage<
                DecryptTextMessage,
                DecryptTextResponse
            >("users", "decryptText", {
                data: {
                    encrypted: text,
                    password,
                },
                expect: "decryptTextResponse",
            });
            return response.text;
        } catch (e) {
            const error = e as SystemErrorMessage;
            failReason.value = `Decryption failed: ${error.data.message}`;
            return null;
        }
    };

    const getText = async (): Promise<string | null> => {
        if (resolvedText.value !== null) {
            return resolvedText.value;
        }

        let text = textRecord.value.text;

        if (textRecord.value.is_encrypted) {
            const result = await decryptText(text);

            if (!result) {
                return null;
            }

            text = result;
        }

        failReason.value = null;
        resolvedText.value = text;

        return text;
    };

    const getFailReason = () => failReason.value;

    const isEncrypted = useComputed(() => textRecord.value.is_encrypted);
    const isResolved = useComputed(() => resolvedText.value !== null);

    const needsUnlocking = useComputed(() =>
        isEncrypted.value && !isResolved.value
    );

    const clearResolvedText = () => resolvedText.value = null;

    return {
        isResolved,
        isEncrypted,
        needsUnlocking,
        getFailReason,
        setInputData,
        getText,
        clearResolvedText,
    };
};
