import SearchBar from "./SearchBar.tsx";
import ListSwitcher, { SwitcherItem } from "$islands/sidebar/ListSwitcher.tsx";
import { useSignal } from "@preact/signals";
import Picker from "$components/Picker.tsx";
import TreeList from "$islands/tree/TreeList.tsx";
import RemindersList from "$islands/sidebar/RemindersList.tsx";
import SharedNotesList from "$islands/sidebar/SharedNotesList.tsx";
import SearchView from "$islands/sidebar/SearchView.tsx";
import { useSearchState } from "./hooks/use-search-state.ts";

interface ListView {
    type: "notes" | "reminders" | "shared" | "recycleBin";
    label: string;
    icon: string;
    placeholder: string;
}

export default function ListPanel() {
    const search = useSearchState();

    const currentType = useSignal<SwitcherItem>({
        type: "notes",
        label: "Notes",
        icon: "note",
        placeholder: "Search notes...",
    });

    const switcher = (
        <ListSwitcher
            selectedItem={currentType.value}
            onSelectItem={(item) => currentType.value = item}
        />
    );

    return (
        <div class="mt-3">
            <SearchBar search={search} />

            {search.isActive.value
                ? <SearchView search={search} />
                : (
                    <Picker<ListView["type"]>
                        selector={currentType.value.type}
                        map={{
                            notes: () => (
                                <TreeList switcherComponent={switcher} />
                            ),
                            reminders: () => (
                                <RemindersList switcherComponent={switcher} />
                            ),
                            shared: () => (
                                <SharedNotesList switcherComponent={switcher} />
                            ),
                            recycleBin: () => (
                                <div>
                                    {switcher}
                                    Recycle Bin
                                </div>
                            ),
                        }}
                    />
                )}
        </div>
    );
}
