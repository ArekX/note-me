import Dialog from "$islands/Dialog.tsx";
import Button from "$components/Button.tsx";
import { useSignal } from "@preact/signals";
import GroupPicker from "../../groups/GroupPicker.tsx";
import Checkbox from "$islands/Checkbox.tsx";
import { TreeRecord } from "$backend/repository/tree-list.repository.ts";
import Input from "$components/Input.tsx";
import TagInput from "$islands/notes/TagInput.tsx";
import { useSearch } from "$frontend/hooks/use-search.ts";
import { SearchType } from "$backend/repository/note-search-repository.ts";

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

    return (
        <Dialog
            visible={true}
            canCancel={true}
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
                        value={searchQuery.value}
                        onInput={(v) => searchQuery.value = v}
                    />
                </div>

                <div class="flex py-2">
                    <div class="basis-1/2">
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
                    <div class="pl-2 basis-1/2">
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
                                    noTransparentBackground={true}
                                    placeholder="Enter tags to filter by"
                                    onChange={(newTags) => tags.value = newTags}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Button color="success" onClick={performSearch}>Search</Button>{" "}
            <Button color="danger" onClick={onClose}>Close</Button>
        </Dialog>
    );
}
