import { useSignal } from "@preact/signals";

export interface DragManagerHook<T> {
    source: T | null;
    target: T | null;
    isDropAllowed: (value: T) => boolean;
    drag: (value: T) => void;
    drop: () => void;
    setDropTarget: (value: T) => void;
}

export const useDragManager = <
    T extends { parent: T | null; children: T[] },
>(): DragManagerHook<T> => {
    const dragSource = useSignal<T | null>(null);
    const dropTarget = useSignal<T | null>(null);

    const isDropAllowed = (value: T) =>
        dragSource.value !== value &&
        dragSource.value?.parent !== value &&
        !dragSource.value?.children.includes(value);

    const drag = (value: T) => dragSource.value = value;

    const drop = () => {
        dragSource.value = null;
        dropTarget.value = null;
    };

    const setDropTarget = (value: T) => {
        dropTarget.value = value;
    };

    return {
        source: dragSource.value,
        target: dropTarget.value,
        isDropAllowed,
        drag,
        drop,
        setDropTarget,
    };
};
