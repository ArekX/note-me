import { ReadonlySignal, useComputed, useSignal } from "@preact/signals";
import { SearchNoteFilters } from "$backend/repository/note-search-repository.ts";

export interface SearchStateHook {
    type: ReadonlySignal<SearchNoteFilters["type"]>;
    query: ReadonlySignal<Omit<SearchNoteFilters, "type" | "from_id">>;
    isActive: ReadonlySignal<boolean>;
    isSimpleSearch: ReadonlySignal<boolean>;
    resetSearch: () => void;
    setQuery: (newQuery: Partial<SearchNoteFilters>) => void;
    setType: (newType: SearchNoteFilters["type"]) => void;
}

export const useSearchState = (): SearchStateHook => {
    const type = useSignal<SearchNoteFilters["type"]>("general");
    const query = useSignal<Omit<SearchNoteFilters, "type" | "from_id">>({
        query: "",
    });

    const isActive = useComputed(() =>
        query.value.query.length > 0 || query.value.group_id !== undefined ||
        (query.value.tag_ids?.length ?? 0) > 0
    );

    const isSimpleSearch = useComputed(() =>
        query.value.query.length > 0 && !query.value.group_id &&
        (query.value.tag_ids?.length ?? 0) === 0
    );

    const resetSearch = () => {
        query.value = {
            query: "",
        };
    };

    const setQuery = (
        newQuery: Partial<Omit<SearchNoteFilters, "type" | "from_id">>,
    ) => {
        query.value = {
            ...query.value,
            ...newQuery,
        };
    };

    const setType = (newType: SearchNoteFilters["type"]) => {
        type.value = newType;
    };

    return {
        type,
        query,
        isActive,
        isSimpleSearch,
        resetSearch,
        setQuery,
        setType,
    };
};
