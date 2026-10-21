<script setup lang="ts">
import { computed, ref } from "vue";
import Button from "@/components/Button.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import Icon from "@/components/Icon.vue";
import PageHeader from "@/components/PageHeader.vue";
import Pagination from "@/components/Pagination.vue";
import FileDropWrapper from "./FileDropWrapper.vue";
import FileFilters, { type FileView } from "./FileFilters.vue";
import FileGrid from "./FileGrid.vue";
import FileSelectionBar from "./FileSelectionBar.vue";
import FileTable from "./FileTable.vue";
import UploadFilesDialog from "./UploadFilesDialog.vue";
import FileViewDialog from "./FileViewDialog.vue";
import { useFileList } from "@/composables/useFileList";
import { useFileSelection } from "@/composables/useFileSelection";
import type { FileMetaRecord } from "@/types/records";

const props = withDefaults(defineProps<{ adminMode?: boolean }>(), {
    adminMode: false,
});

const list = useFileList(() => props.adminMode);
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
    confirmDelete,
    setManyVisibility,
    removeMany,
} = list;

const selection = useFileSelection(files.results, { keepOtherPages: false });
const { selectedFiles } = selection;

const view = ref<FileView>("list");
const viewed = ref<FileMetaRecord | null>(null);
const filesToUpload = ref<File[] | null>(null);
const isDeletingSelected = ref(false);

const isBulkProcessing = computed(() =>
    selectedFiles.value.some((file) => processing.value.has(file.identifier)),
);

const noRowsText = computed(() =>
    hasFilters.value ? "No files match these filters." : "No files found.",
);

const deleteSelected = () => {
    isDeletingSelected.value = false;
    const selected = selectedFiles.value;
    selection.clear();
    void removeMany(selected);
};

const openUpload = (selected: File[]) => {
    filesToUpload.value ??= selected;
};
</script>

<template>
    <FileDropWrapper wrapper-class="w-full" @files-dropped="openUpload">
        <PageHeader
            :title="adminMode ? 'Files' : 'My files'"
            :help="adminMode ? 'admin-files' : undefined"
        >
            <template v-if="adminMode">
                Here you can see and manage files uploaded by all users to
                NoteMe. If a file is deleted, it will no longer be available to
                any user and any links pointing to that file in any of the notes
                will not work. If a file is made public, it will be available to
                all users. If a file is made private, it will only be available
                to the user who uploaded it.
            </template>
            <template v-else>
                Files you uploaded. A public file is available to all users, a
                private one only to you.
            </template>
            <template #actions>
                <Button color="success" @click="filesToUpload = []">
                    <Icon name="cloud-upload" size="lg" />
                    Upload
                </Button>
            </template>
        </PageHeader>
        <UploadFilesDialog
            v-if="filesToUpload"
            :uploader="uploader"
            :initial-files="filesToUpload"
            @upload="upload"
            @close="filesToUpload = null"
        />

        <FileFilters v-model:view="view" :list="list" :admin-mode="adminMode" />

        <FileSelectionBar
            v-if="selectedFiles.length > 0"
            :count="selectedFiles.length"
            :disabled="isBulkProcessing"
            @make-public="setManyVisibility(selectedFiles, true)"
            @make-private="setManyVisibility(selectedFiles, false)"
            @delete="isDeletingSelected = true"
            @clear="selection.clear()"
        />

        <FileTable
            v-if="view === 'list'"
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
            @activate="viewed = $event"
            @view="viewed = $event"
            @delete="fileToDelete = $event"
        />
        <FileGrid
            v-else
            cards
            :files="files.results.value"
            :is-loading="loader.running.value"
            :admin-mode="adminMode"
            :processing="processing"
            :selected-ids="selection.selectedIds.value"
            :no-rows-text="noRowsText"
            @pick="selection.pick"
            @activate="viewed = $event"
            @delete="fileToDelete = $event"
            @toggle-visibility="toggleVisibility"
        />
        <div
            class="flex items-center justify-between gap-4 mt-3 text-sm text-muted"
        >
            <span>{{ files.total.value }} files</span>
            <Pagination
                :total="files.total.value"
                :per-page="files.perPage.value"
                :current-page="files.page.value"
                alignment-class="justify-end"
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
            v-if="isDeletingSelected"
            confirm-color="danger"
            :confirm-text="`Delete ${selectedFiles.length} ${selectedFiles.length === 1 ? 'file' : 'files'}`"
            @confirm="deleteSelected"
            @cancel="isDeletingSelected = false"
        >
            <template #prompt>
                Are you sure you want to delete
                {{ selectedFiles.length }} selected
                {{ selectedFiles.length === 1 ? "file" : "files" }}? This action
                cannot be undone and all notes referencing these files will not
                be able to show them.
            </template>
        </ConfirmDialog>
        <ConfirmDialog
            v-if="fileToDelete"
            confirm-color="danger"
            confirm-text="Delete this file"
            @confirm="confirmDelete()"
            @cancel="fileToDelete = null"
        >
            <template #prompt>
                Are you sure you want to delete '{{ fileToDelete.name }}'? This
                action cannot be undone and all notes referencing this file will
                not be able to show it.
            </template>
        </ConfirmDialog>
    </FileDropWrapper>
</template>
