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
    T extends {
        id: number | null;
        children: T[];
        type: unknown;
    },
>(): DragManagerHook<T> => {
    const dragSource = useSignal<T | null>(null);
    const dropTarget = useSignal<T | null>(null);

    const canDropTo = (target: T) => {
        if (
            target.type === dragSource.value?.type &&
            target.id === dragSource.value?.id
        ) {
            return false;
        }

        return dragSource.value !== null &&
            !(
                target.type === dragSource.value?.type &&
                target.id === dragSource.value?.id
            );
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
