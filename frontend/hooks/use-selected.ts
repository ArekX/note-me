import { useSignal } from "@preact/signals";

export const useSelected = <T>(initialValue: T | null = null) => {
    const selected = useSignal(initialValue);

    const select = (value: T) => selected.value = value;

    const unselect = () => selected.value = null;

    const toggle = (value: T) =>
        selected.value = selected.value === value ? null : value;

    const isSelected = () => selected.value !== null;

    return {
        selected,
        isSelected,
        select,
        unselect,
        toggle,
    };
};
