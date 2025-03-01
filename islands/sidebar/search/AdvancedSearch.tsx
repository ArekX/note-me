import Dialog from "$islands/Dialog.tsx";
import Button from "$components/Button.tsx";
import { useSignal } from "@preact/signals";
import GroupPicker from "../../groups/GroupPicker.tsx";
import Checkbox from "$islands/Checkbox.tsx";
import { SearchType, TreeRecord } from "$db";
import Input from "$components/Input.tsx";
import TagInput from "$islands/notes/TagInput.tsx";
import { useSearch } from "$frontend/hooks/use-search.ts";

interface AdvancedSearchProps {
    onClose: () => void;
}

const typeDisplayMap: { [K in SearchType]: string } = {
    general: "Notes",
    shared: "Shared notes",
    reminders: "Reminders",
    recycleBin: "Recycle Bin",
};

export default function AdvancedSearch(
    { onClose }: AdvancedSearchProps,
) {
    const search = useSearch();
    const selectedGroup = useSignal<TreeRecord | null>(
        search.groupRecord.value ? { ...search.groupRecord.value } : null,
    );
    const shouldFilterByGroup = useSignal<boolean>(
        search.groupRecord.value !== null,
    );
    const shouldFilterByTags = useSignal<boolean>(search.tags.value.length > 0);
    const tags = useSignal<string[]>([...search.tags.value]);
    const searchQuery = useSignal<string>(search.query.value);

    const performSearch = () => {
        search.setGroup(shouldFilterByGroup.value ? selectedGroup.value : null);
        search.setTags(shouldFilterByTags.value ? tags.value : []);
        search.setQuery(searchQuery.value);
        onClose();
    };

    const handleSearchKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            performSearch();
        }
    };

    return (
        <Dialog
            visible
            canCancel
            onCancel={onClose}
            title={`Advanced Search - ${
                typeDisplayMap[search.type.value] ?? ""
            }`}
            props={{
                class: "w-2/3",
            }}
        >
            <div>
                <div>
                    <Input
                        label="Search"
                        placeholder="Search..."
                        disableAutocomplete
                        value={searchQuery.value}
                        onInput={(v) => searchQuery.value = v}
                        onKeydown={handleSearchKeyDown}
                    />
                </div>

                <div class="flex flex-wrap py-2">
                    <div class="basis-1/2 max-md:basis-full">
                        <Checkbox
                            label="Filter by Group"
                            checked={shouldFilterByGroup.value}
                            onChange={(value) =>
                                shouldFilterByGroup.value = value}
                        />
                        {shouldFilterByGroup.value && (
                            <div>
                                <div class="pb-1.5">
                                    {selectedGroup.value
                                        ? `Selected: ${selectedGroup.value.name}`
                                        : "Select group to show notes from"}
                                </div>
                                <GroupPicker
                                    selectedId={selectedGroup.value?.id}
                                    onPick={(r) => selectedGroup.value = r}
                                />
                                <div class="text-sm py-2">
                                    Note: Picking a group will filter notes from
                                    that group and all its subgroups.
                                </div>
                            </div>
                        )}
                    </div>
                    <div class="pl-2 max-md:pl-0 max-md:pt-4 basis-1/2 max-md:basis-full">
                        <Checkbox
                            label="Filter by Tags"
                            checked={shouldFilterByTags.value}
                            onChange={(value) =>
                                shouldFilterByTags.value = value}
                        />
                        {shouldFilterByTags.value && (
                            <div>
                                <div>Enter tags to filter by</div>
                                <TagInput
                                    initialTags={tags.value}
                                    addClass="bg-gray-700/50 border border-b-0 border-gray-600/50 rounded-lg p-2 focus:border-gray-600 "
                                    noTransparentBackground
                                    placeholder="Enter tags to filter by"
                                    onChange={(newTags) => tags.value = newTags}
                                    onEnterPressed={performSearch}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div class="py-2 text-right max-md:text-center">
                <Button
                    color="success"
                    addClass="max-md:w-full max-md:mb-2 max-md:block"
                    onClick={performSearch}
                >
                    Search
                </Button>
                <Button
                    color="primary"
                    addClass="md:ml-2 max-md:w-full max-md:mb-2 max-md:block"
                    onClick={onClose}
                >
                    Close
                </Button>
            </div>
        </Dialog>
    );
}
