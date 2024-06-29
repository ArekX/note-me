import { useSignal } from "@preact/signals";
import { useDebouncedCallback } from "$frontend/hooks/use-debounced-callback.ts";

interface FilterOptions<T> {
    initialFilters: () => T;
    onFilterLoad: () => Promise<void>;
    onFiltersSet?: () => void;
    debounceTime?: number;
}

export const useFilters = <T>({
    initialFilters,
    onFilterLoad,
    onFiltersSet,
    debounceTime,
}: FilterOptions<T>) => {
    const filters = useSignal(initialFilters());

    const performOnUpdated = () => onFilterLoad();

    const triggerDebouncedUpdate = useDebouncedCallback(
        performOnUpdated,
        debounceTime,
    );

    const setFilter = <V extends keyof T>(key: V, value: T[V]) => {
        filters.value = {
            ...filters.value,
            [key]: value,
        };
        onFiltersSet?.();
        triggerDebouncedUpdate();
    };

    const setFilters = (newFilters: Partial<T>) => {
        filters.value = {
            ...filters.value,
            ...(newFilters as Partial<T>),
        };
        onFiltersSet?.();
        triggerDebouncedUpdate();
    };

    const resetFilters = () => {
        filters.value = initialFilters();
        onFiltersSet?.();
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
