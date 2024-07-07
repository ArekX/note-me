import SearchBar from "./SearchBar.tsx";
import ListSwitcher, {
    ListSwitcherItem,
} from "$islands/sidebar/ListSwitcher.tsx";
import { useSignal } from "@preact/signals";
import Button from "$components/Button.tsx";
import Picker from "$components/Picker.tsx";
import TreeList from "$islands/tree/TreeList.tsx";
import RemindersList from "$islands/sidebar/RemindersList.tsx";
import SharedNotesList from "$islands/sidebar/SharedNotesList.tsx";

interface ListView {
    type: "notes" | "reminders" | "shared" | "recycleBin";
    label: string;
    icon: string;
    placeholder: string;
}

export default function ListPanel() {
    const searchQuery = useSignal("");

    const currentType = useSignal<ListView>({
        type: "notes",
        label: "Notes",
        icon: "note",
        placeholder: "Search notes and groups...",
    });

    const switchItems: ListSwitcherItem[] = [
        {
            name: "Notes",
            icon: "note",
            onClick: () => {
                currentType.value = {
                    type: "notes",
                    label: "Notes",
                    icon: "note",
                    placeholder: "Search notes and groups...",
                };
            },
        },
        {
            name: "Reminders",
            icon: "alarm",
            onClick: () => {
                currentType.value = {
                    type: "reminders",
                    label: "Reminders",
                    icon: "alarm",
                    placeholder: "Search reminders...",
                };
            },
        },
        {
            name: "Shared with me",
            icon: "share-alt",
            onClick: () => {
                currentType.value = {
                    type: "shared",
                    label: "Shared with me",
                    icon: "share-alt",
                    placeholder: "Search shared notes...",
                };
            },
        },
        {
            name: "Recycle Bin",
            icon: "recycle",
            onClick: () => {
                currentType.value = {
                    type: "recycleBin",
                    label: "Recycle Bin",
                    icon: "recycle",
                    placeholder: "Search recycle bin items...",
                };
            },
        },
    ];

    const switcher = (
        <ListSwitcher
            items={switchItems}
            currentIcon={currentType.value.icon}
            currentItem={currentType.value.label}
        />
    );

    return (
        <div class="mt-3">
            <SearchBar
                onSearch={(v) => searchQuery.value = v}
                advancedSearchComponent={({
                    onClose,
                }) => (
                    <div>
                        <div class="p-2">
                            TODO: Finish This
                        </div>
                        <Button onClick={onClose} color="danger">Close</Button>
                    </div>
                )}
            />

            <Picker<ListView["type"]>
                selector={currentType.value.type}
                map={{
                    notes: () => (
                        <TreeList
                            searchQuery={searchQuery.value}
                            switcherComponent={switcher}
                        />
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
        </div>
    );
}
