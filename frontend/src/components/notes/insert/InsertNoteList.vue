<script setup lang="ts">
import { ref } from "vue";
import GroupPicker from "@/components/groups/GroupPicker.vue";
import NoteList from "@/components/notes/blocks/NoteList.vue";
import type { TreeRecord } from "@/types/records";

export interface InsertNoteListData {
    groupId: number;
}

const props = defineProps<{ initialData?: InsertNoteListData }>();
const emit = defineEmits<{ insertDataChange: [data: InsertNoteListData] }>();

const selectedGroupId = ref<number | null>(props.initialData?.groupId ?? null);

const selectGroup = (group: TreeRecord) => {
    selectedGroupId.value = group.id;
    emit("insertDataChange", { groupId: group.id });
};
</script>

<template>
    <div class="w-[min(48rem,80vw)] max-md:w-full">
        <div class="py-2 max-md:text-sm">
            Please select a group to display a list of notes from. This list
            will be dynamically updated as notes are added or removed.
        </div>
        <div class="flex flex-wrap">
            <div class="basis-1/4 max-md:basis-full">
                <div class="py-2 font-semibold">Group</div>
                <GroupPicker
                    allow-root
                    :selected-id="selectedGroupId"
                    @pick="selectGroup"
                />
            </div>
            <div
                class="basis-3/4 max-md:basis-full max-md:pt-2 md:pl-2 md:pr-2"
            >
                <div class="py-2 font-semibold">List Preview</div>
                <NoteList
                    v-if="selectedGroupId !== null"
                    :group-id="selectedGroupId"
                    :allow-links="false"
                />
                <div v-else>Select a group to see the note list.</div>
            </div>
        </div>
    </div>
</template>
