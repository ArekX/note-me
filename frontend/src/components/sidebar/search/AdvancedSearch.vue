<script setup lang="ts">
import { ref } from "vue";
import Button from "@/components/Button.vue";
import Checkbox from "@/components/Checkbox.vue";
import Dialog from "@/components/Dialog.vue";
import Icon from "@/components/Icon.vue";
import Input from "@/components/Input.vue";
import GroupPicker from "@/components/groups/GroupPicker.vue";
import TagInput from "@/components/notes/TagInput.vue";
import { useSearchStore, type SearchGroup } from "@/stores/search";
import type { SearchType } from "@/types/records";

const emit = defineEmits<{ close: [] }>();

const typeDisplayMap: Record<SearchType, string> = {
    general: "Notes",
    shared: "Shared notes",
    reminders: "Reminders",
    recycleBin: "Recycle Bin",
};

const search = useSearchStore();

const selectedGroup = ref<SearchGroup | null>(
    search.group ? { ...search.group } : null,
);
const shouldFilterByGroup = ref(search.group !== null);
const shouldFilterByTags = ref(search.tags.length > 0);
const tags = ref<string[]>([...search.tags]);
const searchQuery = ref(search.query);

const performSearch = () => {
    search.setFilters({
        group: shouldFilterByGroup.value ? selectedGroup.value : null,
        tags: shouldFilterByTags.value ? tags.value : [],
        query: searchQuery.value,
    });
    emit("close");
};

const handleSearchKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
        performSearch();
    }
};
</script>

<template>
    <Dialog
        can-cancel
        :title="`Advanced Search - ${typeDisplayMap[search.type] ?? ''}`"
        class="w-2/3"
        icon="filter-alt"
        @cancel="emit('close')"
    >
        <div>
            <Input
                v-model="searchQuery"
                label="Search"
                placeholder="Search..."
                disable-autocomplete
                @keydown="handleSearchKeyDown"
            />

            <div class="flex flex-wrap py-2">
                <div class="basis-1/2 max-md:basis-full">
                    <Checkbox
                        v-model="shouldFilterByGroup"
                        label="Filter by Group"
                    />
                    <div v-if="shouldFilterByGroup">
                        <div class="pb-1.5">
                            {{
                                selectedGroup
                                    ? `Selected: ${selectedGroup.name}`
                                    : "Select group to show notes from"
                            }}
                        </div>
                        <GroupPicker
                            :selected-id="selectedGroup?.id"
                            @pick="
                                (record) =>
                                    (selectedGroup = {
                                        id: record.id,
                                        name: record.name,
                                    })
                            "
                        />
                        <div class="text-sm py-2">
                            Note: Picking a group will filter notes from that
                            group and all its subgroups.
                        </div>
                    </div>
                </div>
                <div
                    class="pl-2 max-md:pl-0 max-md:pt-4 basis-1/2 max-md:basis-full"
                >
                    <Checkbox
                        v-model="shouldFilterByTags"
                        label="Filter by Tags"
                    />
                    <div v-if="shouldFilterByTags">
                        <div>Enter tags to filter by</div>
                        <TagInput
                            :initial-tags="tags"
                            add-class="bg-field border border-line rounded-lg p-2 focus:border-accent"
                            no-transparent-background
                            placeholder="Enter tags to filter by"
                            @change="(newTags) => (tags = newTags)"
                            @enter-pressed="performSearch"
                        />
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <Button @click="emit('close')">Close</Button>
            <Button color="success" @click="performSearch">
                <Icon name="search" size="lg" /> Search
            </Button>
        </template>
    </Dialog>
</template>
