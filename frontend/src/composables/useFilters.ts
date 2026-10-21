import { ref, type Ref } from "vue";
import { useDebouncedCallback } from "./useDebouncedCallback";

interface FilterOptions<T> {
    initialFilters: () => T;
    onFilterLoad: () => unknown;
    onFiltersSet?: () => void;
    debounceTime?: number;
}

export const useFilters = <T extends object>({
    initialFilters,
    onFilterLoad,
    onFiltersSet,
    debounceTime,
}: FilterOptions<T>) => {
    const filters = ref(initialFilters()) as Ref<T>;

    const triggerDebouncedUpdate = useDebouncedCallback(
        onFilterLoad,
        debounceTime,
    );

    const setFilters = (newFilters: Partial<T>) => {
        filters.value = { ...filters.value, ...newFilters };
        onFiltersSet?.();
        triggerDebouncedUpdate();
    };

    const setFilter = <K extends keyof T>(key: K, value: T[K]) =>
        setFilters({ [key]: value } as unknown as Partial<T>);

    const resetFilters = () => {
        filters.value = initialFilters();
        onFiltersSet?.();
        triggerDebouncedUpdate();
    };

    return { filters, setFilter, setFilters, resetFilters };
};
