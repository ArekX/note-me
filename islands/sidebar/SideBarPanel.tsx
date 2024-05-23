import SearchBar from "./SearchBar.tsx";
import ListSwitcher, {
    ListSwitcherItem,
} from "$islands/sidebar/ListSwitcher.tsx";
import { useSignal } from "@preact/signals";
import { RendererViews } from "$islands/sidebar/RenderViews.tsx";

interface ListView {
    type: "notes" | "reminders" | "shared";
    label: string;
    icon: string;
    placeholder: string;
}

export default function ListPanel() {
    const showAdvancedSearch = useSignal(false);
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
    ];

    const RenderView = RendererViews[currentType.value.type];

    return (
        <div class="mt-3">
            <SearchBar
                onSearch={(query) => searchQuery.value = query}
                showAdvancedSearch={showAdvancedSearch.value}
                onTriggerAdvancedSearch={() => showAdvancedSearch.value = true}
                searchPlaceholder={currentType.value.placeholder}
                advancedSearchComponent={
                    <button onClick={() => showAdvancedSearch.value = false}>
                        finish this
                    </button>
                }
            />
            <RenderView
                switcher={
                    <ListSwitcher
                        items={switchItems}
                        currentIcon={currentType.value.icon}
                        currentItem={currentType.value.label}
                    />
                }
                searchQuery={searchQuery.value}
            />
        </div>
    );
}
