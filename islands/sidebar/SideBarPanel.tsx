import SearchBar from "./SearchBar.tsx";
import ListSwitcher, { SwitcherItem } from "$islands/sidebar/ListSwitcher.tsx";
import { useSignal } from "@preact/signals";
import Picker from "$components/Picker.tsx";
import TreeList from "$islands/tree/TreeList.tsx";
import RemindersList from "./reminders/RemindersList.tsx";
import SharedNotesList from "./shared/SharedNotesList.tsx";
import SearchView from "$islands/sidebar/SearchView.tsx";
import { useSearch } from "$frontend/hooks/use-search.ts";
import RecycleBinList from "$islands/sidebar/recycle-bin/RecycleBinList.tsx";

interface ListView {
    type: "notes" | "reminders" | "shared" | "recycleBin";
    label: string;
    icon: string;
    placeholder: string;
}

export default function ListPanel() {
    const search = useSearch();

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
        <div class="pt-3 flex flex-col basis-full overflow-auto">
            <SearchBar />

            <div>
                Switcher
            </div>

            <div class="flex-grow overflow-auto">
                Contents
            </div>

            {search.isActive.value ? <SearchView /> : (
                <Picker<ListView["type"]>
                    selector={currentType.value.type}
                    map={{
                        notes: () => <TreeList switcherComponent={switcher} />,
                        reminders: () => (
                            <RemindersList switcherComponent={switcher} />
                        ),
                        shared: () => (
                            <SharedNotesList switcherComponent={switcher} />
                        ),
                        recycleBin: () => (
                            <RecycleBinList switcherComponent={switcher} />
                        ),
                    }}
                />
            )}
        </div>
    );
}
