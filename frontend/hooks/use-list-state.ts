import { useSignal } from "@preact/signals";

export interface ListMap {
    [key: string]: string;
}

export const useListState = <T extends ListMap>(
    items: T,
    initialId?: keyof T,
    onSelect?: (id: keyof T) => void,
) => {
    const selected = useSignal<keyof T | null>(
        initialId ?? null,
    );

    const selectItem = (itemId: keyof T) => {
        selected.value = itemId;
        onSelect?.(itemId);
    };

    return {
        items,
        selected,
        selectItem,
    };
};
