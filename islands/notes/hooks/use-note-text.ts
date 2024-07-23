import { useEncryptionLock } from "$frontend/hooks/use-encryption-lock.ts";
import { useSignal } from "@preact/signals";
import {
    SystemErrorMessage,
    useWebsocketService,
} from "$frontend/hooks/use-websocket-service.ts";
import {
    GetNoteDetailsMessage,
    GetNoteDetailsResponse,
} from "$workers/websocket/api/notes/messages.ts";
import {
    DecryptTextMessage,
    DecryptTextResponse,
} from "$workers/websocket/api/users/messages.ts";

export type NoteTextRecord = {
    noteId: number;
} | NoteData;

type NoteData = {
    text: string;
    is_encrypted: boolean;
};

interface NoteTextOptions {
    record: NoteTextRecord;
}

export interface NoteTextHook {
    getText: () => Promise<string | null>;
    setRecord: (record: NoteTextRecord) => void;
    getFailReason: () => string | null;
    isEncrypted: () => boolean;
    isResolved: () => boolean;
    clearResolvedText: () => void;
}

export const useNoteText = (options: NoteTextOptions): NoteTextHook => {
    const encryptionLock = useEncryptionLock();
    const { sendMessage } = useWebsocketService();
    const failReason = useSignal<string | null>(null);
    const textRecord = useSignal<NoteTextRecord>(options.record);
    const resolvedText = useSignal<string | null>(
        ("text" in options.record) && !options.record.is_encrypted
            ? options.record.text
            : null,
    );

    const setRecord = (record: NoteTextRecord) => {
        if (
            ("text" in record) && record.text === resolvedText.value
        ) {
            return;
        }

        textRecord.value = record;

        failReason.value = null;
        if (("text" in record) && !record.is_encrypted) {
            resolvedText.value = record.text;
        } else {
            resolvedText.value = null;
        }
    };

    const isEncrypted = () =>
        "is_encrypted" in textRecord.value
            ? textRecord.value.is_encrypted
            : false;

    const getNoteText = async (id: number): Promise<NoteData | null> => {
        try {
            const response = await sendMessage<
                GetNoteDetailsMessage,
                GetNoteDetailsResponse
            >("notes", "getNoteDetails", {
                data: {
                    id,
                    options: {
                        include_note: true,
                    },
                },
                expect: "getNoteDetailsResponse",
            });

            return {
                text: response.record.note,
                is_encrypted: response.record.is_encrypted ?? false,
            };
        } catch (e) {
            const error = e as SystemErrorMessage;
            failReason.value =
                `Note text retrieve failed: ${error.data.message}`;

            return null;
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

        let text;
        let isEncrypted;

        if ("noteId" in textRecord.value) {
            const result = await getNoteText(textRecord.value.noteId);

            if (!result) {
                return null;
            }

            text = result.text;
            isEncrypted = result.is_encrypted;
        } else {
            text = textRecord.value.text;
            isEncrypted = textRecord.value.is_encrypted;
        }

        if (isEncrypted) {
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

    const isResolved = () => resolvedText.value !== null;

    const clearResolvedText = () => resolvedText.value = null;

    return {
        getFailReason,
        setRecord,
        isEncrypted,
        getText,
        isResolved,
        clearResolvedText,
    };
};
