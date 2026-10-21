<script setup lang="ts">
import { onMounted, ref } from "vue";
import GroupPickerItem from "./GroupPickerItem.vue";
import { useLoader } from "@/composables/useLoader";
import { useGroupsStore } from "@/stores/groups";
import type { TreeRecord } from "@/types/records";

// The "Top Level" record has id 0.
withDefaults(
    defineProps<{ selectedId?: number | null; allowRoot?: boolean }>(),
    { selectedId: null, allowRoot: false },
);

const emit = defineEmits<{ pick: [record: TreeRecord] }>();

const groupsStore = useGroupsStore();
const loader = useLoader(true);

const records = ref<TreeRecord[]>([]);

const topLevel: TreeRecord = {
    id: 0,
    type: "group",
    name: "Top Level",
    is_encrypted: 0,
    has_children: 1,
};

onMounted(
    loader.wrap(async () => {
        records.value = await groupsStore.findGroups();
    }),
);
</script>

<template>
    <div class="border-solid border-line p-4 border rounded-lg group-picker">
        <div
            v-if="loader.running.value"
            role="status"
            aria-busy="true"
            aria-label="Loading"
        >
            <div
                v-for="width in ['w-32', 'w-24', 'w-40', 'w-28']"
                :key="width"
                class="flex items-center gap-2 px-2 py-1.5"
            >
                <span class="skeleton size-5 rounded-md" />
                <span :class="['skeleton h-3.5', width]" />
            </div>
        </div>
        <template v-else>
            <div
                v-if="!allowRoot && records.length === 0"
                class="text-center text-muted"
            >
                No groups found
            </div>
            <GroupPickerItem
                v-if="allowRoot"
                is-root
                :record="topLevel"
                :selected-id="selectedId"
                @pick="emit('pick', $event)"
            />
            <div :class="allowRoot ? 'pl-2' : ''">
                <GroupPickerItem
                    v-for="record in records"
                    :key="record.id"
                    :record="record"
                    :selected-id="selectedId"
                    @pick="emit('pick', $event)"
                />
            </div>
        </template>
    </div>
</template>
