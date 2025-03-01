import { signal } from "@preact/signals";
import { useEffect } from "preact/hooks";

export const activeNoteId = signal<number | null>(null);

interface ActiveNoteEffectOptions {
    noteId: number | null;
    historyMode: boolean;
}

export const useActiveNoteEffect = (
    { noteId, historyMode }: ActiveNoteEffectOptions,
) => {
    useEffect(() => {
        if (historyMode) {
            return;
        }

        activeNoteId.value = noteId;
    }, [noteId, historyMode]);

    useEffect(() => {
        return historyMode ? undefined : () => activeNoteId.value = null;
    }, [historyMode]);
};
