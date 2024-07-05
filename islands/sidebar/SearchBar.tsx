import Icon from "$components/Icon.tsx";
import Dialog from "$islands/Dialog.tsx";
import { useSignal } from "@preact/signals";
import { JSX } from "preact";
import { useDebouncedCallback } from "$frontend/hooks/use-debounced-callback.ts";

interface SearchBarProps<T> {
    queryPlaceHolder?: string;
    onSearch: (query: string) => void;
    advancedSearchComponent?: (props: {
        onClose: () => void;
    }) => JSX.Element;
}

export default function SearchBar<T>(
    {
        queryPlaceHolder = "Search...",
        onSearch,
        advancedSearchComponent: AdvancedSearch,
    }: SearchBarProps<T>,
) {
    const showAdvancedSearch = useSignal(false);
    const searchQuery = useSignal("");

    const triggerOnSearch = useDebouncedCallback(() =>
        onSearch(searchQuery.value)
    );

    const handleSearchInput = (e: Event) => {
        searchQuery.value = (e.target as HTMLInputElement).value;
        triggerOnSearch();
    };

    return (
        <div class="flex relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-400">
                <Icon name="search-alt" />
            </div>
            {AdvancedSearch && (
                <div
                    class="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-white cursor-pointer"
                    title="Advanced search"
                    onClick={() => showAdvancedSearch.value = true}
                >
                    <Icon name="filter-alt" />
                </div>
            )}
            <input
                type="text"
                class="outline-none border-1 pl-9 pr-9 border-gray-900 bg-gray-700 p-2 w-full"
                placeholder={queryPlaceHolder}
                value={searchQuery.value}
                onInput={handleSearchInput}
            />
            {AdvancedSearch && (
                <Dialog
                    visible={showAdvancedSearch.value}
                    canCancel={true}
                    onCancel={() => showAdvancedSearch.value = false}
                >
                    <AdvancedSearch
                        onClose={() => showAdvancedSearch.value = false}
                    />
                </Dialog>
            )}
        </div>
    );
}
