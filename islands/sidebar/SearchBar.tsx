import Icon from "$components/Icon.tsx";
import { useSignal } from "@preact/signals";
import AdvancedSearch from "$islands/sidebar/search/AdvancedSearch.tsx";
import { useSearch } from "$frontend/hooks/use-search.ts";

interface SearchBarProps<T> {
    queryPlaceHolder?: string;
}

export default function SearchBar<T>(
    {
        queryPlaceHolder = "Search...",
    }: SearchBarProps<T>,
) {
    const search = useSearch();
    const showAdvancedSearch = useSignal(false);

    return (
        <div class="flex relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-400">
                <Icon
                    onClick={() => search.resetSearch()}
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
                class="transition-colors outline-none border-1 pl-9 pr-9 focus:border-gray-600 border-transparent border-t bg-gray-700 bg-opacity-30 hover:bg-opacity-100 focus:bg-opacity-100 p-2 w-full"
                placeholder={queryPlaceHolder}
                value={search.query.value}
                onInput={(e) =>
                    search.setQuery((e.target as HTMLInputElement).value)}
            />
            {showAdvancedSearch.value && (
                <AdvancedSearch
                    onClose={() => showAdvancedSearch.value = false}
                />
            )}
        </div>
    );
}
