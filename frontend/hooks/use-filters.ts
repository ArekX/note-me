import { useSignal } from "@preact/signals";
import { useDebouncedCallback } from "$frontend/hooks/use-debounced-callback.ts";

interface FilterOptions<T> {
    initialFilters: () => T;
    onFilterUpdated: () => Promise<void>;
    debounceTime?: number;
}

export const useFilters = <T>({
    initialFilters,
    onFilterUpdated,
    debounceTime,
}: FilterOptions<T>) => {
    const filters = useSignal(initialFilters());

    const performOnUpdated = () => onFilterUpdated();

    const triggerDebouncedUpdate = useDebouncedCallback(
        performOnUpdated,
        debounceTime,
    );

    const setFilter = <V extends keyof T>(key: V, value: T[V]) => {
        filters.value = {
            ...filters.value,
            [key]: value,
        };
        triggerDebouncedUpdate();
    };

    const setFilters = (newFilters: Partial<T>) => {
        filters.value = {
            ...filters.value,
            ...(newFilters as Partial<T>),
        };
        triggerDebouncedUpdate();
    };

    const resetFilters = () => {
        filters.value = initialFilters();
        triggerDebouncedUpdate();
    };

    return {
        filters,
        performOnUpdated,
        setFilter,
        setFilters,
        resetFilters,
    };
};
