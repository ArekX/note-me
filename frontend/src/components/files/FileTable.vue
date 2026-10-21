<script setup lang="ts">
import { computed } from "vue";
import Badge from "@/components/Badge.vue";
import Icon from "@/components/Icon.vue";
import IconButton from "@/components/IconButton.vue";
import Loader from "@/components/Loader.vue";
import Table, { type TableColumn } from "@/components/Table.vue";
import TimeAgo from "@/components/TimeAgo.vue";
import FileSize from "./FileSize.vue";
import { fileKind, fileKindIcons } from "@/lib/file-kind";
import { getFileDownloadUrl } from "@/lib/markdown-snippets";
import type { FileMetaRecord } from "@/types/records";

const props = defineProps<{
    files: FileMetaRecord[];
    isLoading: boolean;
    adminMode: boolean;
    processing: Set<string>;
    selectedIds: Set<string>;
    allSelected: boolean;
    noRowsText: string;
}>();

const emit = defineEmits<{
    pick: [file: FileMetaRecord, multiple: boolean];
    toggle: [file: FileMetaRecord];
    toggleAll: [];
    activate: [file: FileMetaRecord];
    view: [file: FileMetaRecord];
    delete: [file: FileMetaRecord];
}>();

const columns = computed<TableColumn<FileMetaRecord>[]>(() => [
    { id: "select", name: "", headerClass: "w-10", cellClass: "w-10" },
    { id: "name", name: "Name", cellClass: "max-w-80 truncate" },
    { id: "size", name: "Size", cellClass: "text-muted whitespace-nowrap" },
    ...(props.adminMode
        ? [
              {
                  id: "owner",
                  name: "Owner",
                  key: "created_by" as const,
                  cellClass: "text-muted",
              },
          ]
        : []),
    {
        id: "uploaded",
        name: "Uploaded",
        cellClass: "text-muted whitespace-nowrap",
    },
    { id: "visibility", name: "Visibility" },
    { id: "actions", name: "", cellClass: "text-right whitespace-nowrap" },
]);

const selectedCount = computed(
    () =>
        props.files.filter((file) => props.selectedIds.has(file.identifier))
            .length,
);
</script>

<template>
    <Table
        :columns="columns"
        :rows="files"
        :is-loading="isLoading"
        :row-key="(file) => file.identifier"
        :row-class="
            (file) => (selectedIds.has(file.identifier) ? 'bg-accent-soft' : '')
        "
        :no-rows-text="noRowsText"
    >
        <template #header-select>
            <input
                type="checkbox"
                class="size-4 align-middle accent-accent cursor-pointer"
                title="Select all files on this page"
                aria-label="Select all files on this page"
                :checked="allSelected"
                :indeterminate="selectedCount > 0 && !allSelected"
                :disabled="files.length === 0"
                @change="emit('toggleAll')"
            />
        </template>
        <template #cell-select="{ row: file }">
            <input
                type="checkbox"
                class="size-4 align-middle accent-accent cursor-pointer"
                :aria-label="`Select ${file.name}`"
                :checked="selectedIds.has(file.identifier)"
                @change="emit('toggle', file)"
            />
        </template>
        <template #cell-name="{ row: file }">
            <button
                type="button"
                class="file-name max-w-full truncate text-left cursor-pointer hover:underline"
                :title="file.name"
                @click="emit('pick', file, $event.ctrlKey)"
                @dblclick="emit('activate', file)"
            >
                <Icon
                    :name="fileKindIcons[fileKind(file.mime_type)]"
                    size="lg"
                    class-name="text-muted mr-1.5"
                />
                {{ file.name }}
            </button>
        </template>
        <template #cell-size="{ row: file }">
            <FileSize :size="file.size" />
        </template>
        <template #cell-uploaded="{ row: file }">
            <TimeAgo :time="file.created_at" />
        </template>
        <template #cell-visibility="{ row: file }">
            <Badge :tone="file.is_public ? 'accent' : 'neutral'">
                {{ file.is_public ? "Public" : "Private" }}
            </Badge>
        </template>
        <template #cell-actions="{ row: file }">
            <Loader v-if="processing.has(file.identifier)" size="sm" />
            <template v-else>
                <IconButton
                    icon="show"
                    title="View"
                    @click="emit('view', file)"
                />
                <a :href="getFileDownloadUrl(file.identifier)">
                    <IconButton icon="download" title="Download" />
                </a>
                <IconButton
                    icon="trash"
                    title="Delete file"
                    danger
                    @click="emit('delete', file)"
                />
            </template>
        </template>
    </Table>
</template>
