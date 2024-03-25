import { useSignal } from "@preact/signals";
import { Icon } from "$components/Icon.tsx";
import Dialog from "$islands/Dialog.tsx";
import { ComponentChild } from "preact";

interface SearchBarProps {
    advancedSearchComponent?: ComponentChild;
    showAdvancedSearch?: boolean;
    searchPlaceholder?: string;
    onSearch: (query: string) => void;
    onTriggerAdvancedSearch: () => void;
}

export default function SearchBar(
    {
        onSearch,
        onTriggerAdvancedSearch,
        advancedSearchComponent,
        showAdvancedSearch,
        searchPlaceholder = "Search...",
    }: SearchBarProps,
) {
    return (
        <div class="flex relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-400">
                <Icon name="search-alt" />
            </div>
            {advancedSearchComponent && (
                <div
                    class="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-white cursor-pointer"
                    title="Advanced search"
                    onClick={onTriggerAdvancedSearch}
                >
                    <Icon name="filter-alt" />
                </div>
            )}
            <input
                type="text"
                class="outline-none border-1 pl-9 pr-9 border-gray-900 bg-gray-700 p-2 w-full"
                placeholder={searchPlaceholder}
                onInput={(e) => onSearch((e.target as HTMLInputElement).value)}
            />
            <Dialog visible={!!showAdvancedSearch}>
                {advancedSearchComponent}
            </Dialog>
        </div>
    );
}
