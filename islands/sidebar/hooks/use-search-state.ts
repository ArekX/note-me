import { ReadonlySignal, useComputed, useSignal } from "@preact/signals";

export interface SearchStateHook<T = unknown> {
    request: ReadonlySignal<SearchRequest<T>>;
    simpleSearchQuery: ReadonlySignal<string>;
    isActive: ReadonlySignal<boolean>;
    searchSimple: (text: string) => void;
    searchAdvanced: (data: T) => void;
}

export type SearchRequest<T = object> =
    | {
        type: "simple";
        query: string;
    }
    | ({
        type: "advanced";
    } & T);

export const useSearchState = <T = unknown>(): SearchStateHook<T> => {
    const query = useSignal<string>("");
    const advancedSearch = useSignal<T | null>(null);
    const searchType = useSignal<"simple" | "advanced">("simple");

    const isActive = useComputed(() => query.value.length > 0);

    const searchRequest = useComputed<SearchRequest<T>>(() => {
        if (searchType.value === "simple") {
            return {
                type: "simple",
                query: query.value,
            };
        }

        return {
            type: "advanced",
            ...advancedSearch.value!,
        };
    });

    const searchSimple = (text: string) => {
        query.value = text;
        advancedSearch.value = null;
        searchType.value = "simple";
    };

    const searchAdvanced = (data: T) => {
        advancedSearch.value = data;
        query.value = "";
        searchType.value = "advanced";
    };

    return {
        request: searchRequest,
        simpleSearchQuery: query,
        isActive,
        searchSimple,
        searchAdvanced,
    };
};
