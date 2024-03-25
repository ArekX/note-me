import SearchBar from "$islands/groups/SearchBar.tsx";
import GroupList from "$islands/groups/GroupList.tsx";
import {
    ListSwitcher,
    ListSwitcherItem,
} from "$islands/sidebar/ListSwitcher.tsx";
import { useSignal } from "@preact/signals";

export const ListPanel = () => {
    const showAdvancedSearch = useSignal(false);
    const searchQuery = useSignal("");

    const switchItems: ListSwitcherItem[] = [
        {
            name: "Notes",
            icon: "note",
            onClick: () => {
                selectedItem.value = "Notes";
                selectedIcon.value = "note";
            },
        },
        {
            name: "Reminders",
            icon: "alarm",
            onClick: () => {
                selectedItem.value = "Reminders";
                selectedIcon.value = "alarm";
            },
        },
        {
            name: "Shared",
            icon: "share-alt",
            onClick: () => {
                selectedItem.value = "Shared";
                selectedIcon.value = "share-alt";
            },
        },
    ];
    const selectedItem = useSignal("Notes");
    const selectedIcon = useSignal("note");

    return (
        <div class="mt-3">
            <SearchBar
                onSearch={(query) => searchQuery.value = query}
                showAdvancedSearch={showAdvancedSearch.value}
                onTriggerAdvancedSearch={() => showAdvancedSearch.value = true}
                searchPlaceholder="Search notes and groups..."
                advancedSearchComponent={
                    <button onClick={() => showAdvancedSearch.value = false}>
                        finish this
                    </button>
                }
            />
            <GroupList
                searchQuery={searchQuery.value}
                switcherComponent={
                    <ListSwitcher
                        items={switchItems}
                        currentIcon={selectedIcon.value}
                        currentItem={selectedItem.value}
                    />
                }
            />
        </div>
    );
};
