<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Button from "@/components/Button.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import Icon from "@/components/Icon.vue";
import Pagination from "@/components/Pagination.vue";
import FileDropWrapper from "./FileDropWrapper.vue";
import FileFilters, { type FileView } from "./FileFilters.vue";
import FileGrid from "./FileGrid.vue";
import FileTable from "./FileTable.vue";
import FileViewDialog from "./FileViewDialog.vue";
import UploadFilesDialog from "./UploadFilesDialog.vue";
import { useFileList } from "@/composables/useFileList";
import { useFileSelection } from "@/composables/useFileSelection";
import type { FileKind } from "@/lib/file-kind";
import type { FileMetaRecord } from "@/types/records";

const props = withDefaults(
    defineProps<{ adminMode?: boolean; kind?: FileKind }>(),
    { adminMode: false, kind: undefined },
);

const emit = defineEmits<{
    filesPicked: [files: FileMetaRecord[]];
    fileActivated: [file: FileMetaRecord];
}>();

const list = useFileList(() => props.adminMode, props.kind);
const {
    uploader,
    loader,
    files,
    processing,
    fileToDelete,
    hasFilters,
    changePage,
    upload,
    toggleVisibility,
    confirmDelete: deleteFile,
} = list;

const selection = useFileSelection(files.results, { keepOtherPages: true });

watch(selection.selectedFiles, (picked) => emit("filesPicked", picked));

const view = ref<FileView>("grid");
const viewed = ref<FileMetaRecord | null>(null);
const filesToUpload = ref<File[] | null>(null);

const noRowsText = computed(() =>
    hasFilters.value ? "No files match these filters." : "No files found.",
);

const openUpload = (selected: File[]) => {
    filesToUpload.value ??= selected;
};

const confirmDelete = () => deleteFile(selection.remove);
</script>

<template>
    <FileDropWrapper
        wrapper-class="file-picker w-full"
        @files-dropped="openUpload"
    >
        <FileFilters v-model:view="view" :list="list" :admin-mode="adminMode">
            <template #actions>
                <Button color="success" @click="filesToUpload = []">
                    <Icon name="cloud-upload" size="lg" />
                    Upload
                </Button>
            </template>
        </FileFilters>
        <UploadFilesDialog
            v-if="filesToUpload"
            :uploader="uploader"
            :initial-files="filesToUpload"
            @upload="upload"
            @close="filesToUpload = null"
        />

        <FileGrid
            v-if="view === 'grid'"
            size="threeColumns"
            :files="files.results.value"
            :is-loading="loader.running.value"
            :admin-mode="adminMode"
            :processing="processing"
            :selected-ids="selection.selectedIds.value"
            :no-rows-text="noRowsText"
            @pick="selection.pick"
            @activate="emit('fileActivated', $event)"
            @delete="fileToDelete = $event"
            @toggle-visibility="toggleVisibility"
        />
        <FileTable
            v-else
            :files="files.results.value"
            :is-loading="loader.running.value"
            :admin-mode="adminMode"
            :processing="processing"
            :selected-ids="selection.selectedIds.value"
            :all-selected="selection.allSelected.value"
            :no-rows-text="noRowsText"
            @pick="selection.pick"
            @toggle="selection.toggle"
            @toggle-all="selection.toggleAll"
            @activate="emit('fileActivated', $event)"
            @view="viewed = $event"
            @delete="fileToDelete = $event"
        />
        <div class="mt-2 mb-2">
            <Pagination
                :total="files.total.value"
                :per-page="files.perPage.value"
                :current-page="files.page.value"
                @change="changePage"
            />
        </div>

        <FileViewDialog
            v-if="viewed"
            :file="viewed"
            :admin-mode="adminMode"
            :is-processing="processing.has(viewed.identifier)"
            @close="viewed = null"
            @toggle-visibility="toggleVisibility(viewed)"
        />
        <ConfirmDialog
            v-if="fileToDelete"
            confirm-color="danger"
            confirm-text="Delete this file"
            @confirm="confirmDelete"
            @cancel="fileToDelete = null"
        >
            <template #prompt>
                <div>
                    Are you sure you want to delete '{{ fileToDelete.name }}'
                    file?
                    <p>
                        This action cannot be undone and all notes referencing
                        this file will not be able to show it.
                    </p>
                </div>
            </template>
        </ConfirmDialog>
    </FileDropWrapper>
</template>
