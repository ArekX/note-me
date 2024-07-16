import Icon from "$components/Icon.tsx";
import Dialog from "$islands/Dialog.tsx";
import { useSignal } from "@preact/signals";
import { SearchStateHook } from "./hooks/use-search-state.ts";
import AdvancedSearch from "$islands/sidebar/search/AdvancedSearch.tsx";

interface SearchBarProps<T> {
    queryPlaceHolder?: string;
    search: SearchStateHook;
}

export default function SearchBar<T>(
    {
        queryPlaceHolder = "Search...",
        search,
    }: SearchBarProps<T>,
) {
    const showAdvancedSearch = useSignal(false);

    return (
        <div class="flex relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-400">
                <Icon
                    onClick={() => search.reset()}
                    className={search.isActive.value ? "cursor-pointer" : ""}
                    name={search.isActive.value ? "minus-circle" : "search-alt"}
                />
            </div>

            <div
                class="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-white cursor-pointer"
                title="Advanced search"
                onClick={() => showAdvancedSearch.value = true}
            >
                <Icon name="filter-alt" />
            </div>

            <input
                type="text"
                class="outline-none border-1 pl-9 pr-9 border-gray-900 bg-gray-700 p-2 w-full"
                placeholder={queryPlaceHolder}
                value={search.simpleSearchQuery.value}
                onInput={(e) =>
                    search.searchSimple((e.target as HTMLInputElement).value)}
            />
            {showAdvancedSearch.value && (
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
