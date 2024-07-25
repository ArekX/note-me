import { ReadonlySignal, useComputed, useSignal } from "@preact/signals";
import { LoaderHook, useLoader } from "$frontend/hooks/use-loader.ts";
import { useContentEncryption } from "$frontend/hooks/use-content-encryption.ts";

export type InputNoteData = {
    text: string;
    is_encrypted: boolean;
    is_resolved?: boolean;
};

interface NoteTextOptions {
    initialData?: InputNoteData;
    onLock?: () => void;
    onInputDataChange?: (record: InputNoteData) => void;
}

export interface NoteTextHook {
    isEncrypted: ReadonlySignal<boolean>;
    isResolved: ReadonlySignal<boolean>;
    needsUnlocking: ReadonlySignal<boolean>;
    processingLoader: LoaderHook;
    getText: () => Promise<string | null>;
    setInputData: (record: InputNoteData) => void;
    getFailReason: () => string | null;
    clearResolvedText: () => void;
}

export const useNoteText = ({
    initialData = { text: "", is_encrypted: false },
    onInputDataChange,
}: NoteTextOptions = {}): NoteTextHook => {
    const contentEncryption = useContentEncryption();
    const processingLoader = useLoader();
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

        onInputDataChange?.(record);
    };

    const getText = processingLoader.wrap(async (): Promise<string | null> => {
        if (resolvedText.value !== null) {
            return resolvedText.value;
        }

        let text = textRecord.value.text;

        if (textRecord.value.is_encrypted) {
            const result = await contentEncryption.decryptText(text);

            if (!result) {
                return null;
            }

            text = result;
        }

        failReason.value = null;
        resolvedText.value = text;

        return text;
    });

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
        processingLoader,
        getFailReason,
        setInputData,
        getText,
        clearResolvedText,
    };
};
