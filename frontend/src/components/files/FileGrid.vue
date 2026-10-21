<script setup lang="ts">
import { computed } from "vue";
import FileItem from "./FileItem.vue";
import { useResponsiveQuery } from "@/composables/useResponsiveQuery";
import type { FileMetaRecord } from "@/types/records";

const gridSizes = {
    threeColumns: "grid-cols-3 gap-2",
    fiveColumns: "grid-cols-5 gap-4",
} as const;

const props = withDefaults(
    defineProps<{
        files: FileMetaRecord[];
        isLoading: boolean;
        adminMode: boolean;
        processing: Set<string>;
        selectedIds: Set<string>;
        noRowsText: string;
        size?: keyof typeof gridSizes;
        cards?: boolean;
    }>(),
    { size: "fiveColumns", cards: false },
);

const emit = defineEmits<{
    pick: [file: FileMetaRecord, multiple: boolean];
    activate: [file: FileMetaRecord];
    delete: [file: FileMetaRecord];
    toggleVisibility: [file: FileMetaRecord];
}>();

const query = useResponsiveQuery();

const gridClass = computed(() => {
    if (query.isMobile()) {
        return "grid-cols-1";
    }
    return query.between("md", "lg")
        ? gridSizes.threeColumns
        : gridSizes[props.size];
});
</script>

<template>
    <div
        v-if="isLoading"
        :class="['grid', gridClass]"
        role="status"
        aria-busy="true"
        aria-label="Loading files"
    >
        <span
            v-for="index in 10"
            :key="index"
            class="skeleton h-48 rounded-lg"
        />
    </div>
    <div v-else :class="['grid', gridClass]">
        <FileItem
            v-for="file in files"
            :key="file.identifier"
            :file="file"
            :admin-mode="adminMode"
            :card="cards"
            :is-selected="selectedIds.has(file.identifier)"
            :is-processing="processing.has(file.identifier)"
            @select="emit('pick', file, false)"
            @select-multiple="emit('pick', file, true)"
            @activate="emit('activate', file)"
            @delete="emit('delete', file)"
            @toggle-visibility="emit('toggleVisibility', file)"
        />
        <div
            v-if="files.length === 0"
            class="col-span-full text-center text-muted py-8"
        >
            {{ noRowsText }}
        </div>
    </div>
</template>
