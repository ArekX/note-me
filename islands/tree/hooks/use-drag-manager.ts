import { useSignal } from "@preact/signals";

export interface DragManagerHook<T> {
    source: T | null;
    target: T | null;
    canDropTo: (value: T) => boolean;
    drag: (value: T) => void;
    reset: () => void;
    setDropTarget: (value: T | null) => void;
}

export const useDragManager = <
    T extends { id: number | null; parent: T | null; children: T[] },
>(): DragManagerHook<T> => {
    const dragSource = useSignal<T | null>(null);
    const dropTarget = useSignal<T | null>(null);

    const canDropTo = (target: T) => {
        return dragSource.value !== null &&
            dragSource.value.id !== target.id &&
            dragSource.value.parent?.id !== target.id;
    };

    const drag = (value: T) => {
        dragSource.value = value;
    };

    const reset = () => {
        dragSource.value = null;
        dropTarget.value = null;
    };

    const setDropTarget = (value: T | null) => {
        dropTarget.value = value;
    };

    return {
        source: dragSource.value,
        target: dropTarget.value,
        canDropTo,
        drag,
        reset,
        setDropTarget,
    };
};
