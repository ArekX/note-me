import { signal } from "@preact/signals";
import { useEffect } from "preact/hooks";

export const activeNoteId = signal<number | null>(null);

interface ActiveNoteEffectOptions {
    noteId: number | null;
    historyMode: boolean;
}

export const useActiveNoteEffect = (
    noteId: number | null,
) => {
    useEffect(() => {
        activeNoteId.value = noteId;
    }, [noteId]);

    useEffect(() => () => activeNoteId.value = null, []);
};
