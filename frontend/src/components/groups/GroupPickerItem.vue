<script setup lang="ts">
import { ref } from "vue";
import Icon from "@/components/Icon.vue";
import { useLoader } from "@/composables/useLoader";
import { useGroupsStore } from "@/stores/groups";
import type { TreeRecord } from "@/types/records";

const props = withDefaults(
    defineProps<{
        record: TreeRecord;
        selectedId?: number | null;
        isRoot?: boolean;
    }>(),
    { selectedId: null, isRoot: false },
);

const emit = defineEmits<{ pick: [record: TreeRecord] }>();

const groupsStore = useGroupsStore();
const loader = useLoader();

const children = ref<TreeRecord[] | null>(props.isRoot ? [] : null);
const isOpen = ref(props.isRoot);
const loadChildren = loader.wrap(async () => {
    children.value = await groupsStore.findGroups(props.record.id);
});

const toggle = async () => {
    if (props.isRoot || props.record.has_children !== 1) {
        return;
    }
    if (children.value === null) {
        await loadChildren();
    }
    isOpen.value = !isOpen.value;
};
</script>

<template>
    <div
        class="cursor-pointer"
        @click.stop="emit('pick', record)"
        @dblclick.stop="toggle"
    >
        <div
            :class="[
                'hover:bg-surface-2 select-none px-2 py-1.5 rounded-md',
                record.id === selectedId ? 'bg-accent-soft text-accent' : '',
            ]"
        >
            <Icon
                :type="record.has_children ? 'solid' : 'regular'"
                :name="isOpen ? 'folder-open' : 'folder'"
                class-name="mr-1"
            />
            <span class="mt-1 inline-block align-middle">{{
                record.name
            }}</span>
        </div>
        <div
            v-if="loader.running.value"
            role="status"
            aria-busy="true"
            aria-label="Loading"
            class="pl-4"
        >
            <div
                v-for="width in ['w-28', 'w-20']"
                :key="width"
                class="flex items-center gap-2 px-2 py-1.5"
            >
                <span class="skeleton size-5 rounded-md" />
                <span :class="['skeleton h-3.5', width]" />
            </div>
        </div>
        <div v-else-if="isOpen && children" class="pl-4">
            <GroupPickerItem
                v-for="child in children"
                :key="child.id"
                :record="child"
                :selected-id="selectedId"
                @pick="emit('pick', $event)"
            />
        </div>
    </div>
</template>
