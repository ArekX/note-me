<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Checkbox from "@/components/Checkbox.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import Loader from "@/components/Loader.vue";
import Skeleton from "@/components/Skeleton.vue";
import FileSize from "@/components/files/FileSize.vue";
import { useLoader } from "@/composables/useLoader";
import { findFileIdentifiers } from "@/lib/markdown-links";
import { getFileViewUrl } from "@/lib/markdown-snippets";
import { useFilesStore } from "@/stores/files";
import { useNotesStore } from "@/stores/notes";
import { useToastStore } from "@/stores/toast";
import type { FileMetaRecord } from "@/types/records";

// A deleted note keeps its files; the
// ones checked here are deleted with it (decision 0.48).
const props = defineProps<{ noteId: number; text: string }>();
const emit = defineEmits<{ close: [] }>();

const notesStore = useNotesStore();
const filesStore = useFilesStore();
const toastStore = useToastStore();
const deleting = useLoader();
const loadingFiles = useLoader(true);
const files = ref<FileMetaRecord[]>([]);
const selected = ref(new Set<string>());

const allSelected = computed(
    () => files.value.length > 0 && selected.value.size === files.value.length,
);

const { reportError } = toastStore;

const toggleFile = (identifier: string, checked: boolean) => {
    const next = new Set(selected.value);
    if (checked) {
        next.add(identifier);
    } else {
        next.delete(identifier);
    }
    selected.value = next;
};

const toggleAll = (checked: boolean) => {
    selected.value = checked
        ? new Set(files.value.map((file) => file.identifier))
        : new Set();
};

const confirmDelete = () =>
    deleting.run(async () => {
        try {
            await notesStore.deleteNote(props.noteId);
            for (const identifier of selected.value) {
                await filesStore.remove(identifier);
            }
        } catch (error) {
            reportError(error);
        }
        emit("close");
    });

onMounted(() =>
    loadingFiles.run(async () => {
        const identifiers = findFileIdentifiers(props.text);
        if (identifiers.length === 0) {
            return;
        }
        try {
            files.value = await filesStore.details(identifiers);
        } catch (error) {
            reportError(error);
        }
    }),
);
</script>

<template>
    <ConfirmDialog
        visible
        :is-processing="deleting.running.value"
        confirm-text="Delete note"
        confirm-color="danger"
        @cancel="emit('close')"
        @confirm="confirmDelete"
    >
        <template #prompt>
            <Loader v-if="deleting.running.value" color="white">
                Deleting note...
            </Loader>
            <template v-else>
                <div>Are you sure you want to delete this note?</div>
                <Skeleton
                    v-if="loadingFiles.running.value"
                    :count="3"
                    class="py-2"
                />
                <div v-else-if="files.length > 0" class="py-2 text-left">
                    <p class="font-semibold">
                        Uploaded files found in this note
                    </p>
                    <p class="py-1 text-sm text-muted">
                        Checked files will be deleted together with the note.
                    </p>
                    <div class="py-1">
                        <Checkbox
                            label="Check all"
                            :model-value="allSelected"
                            @update:model-value="toggleAll"
                        />
                    </div>
                    <ul class="ml-2">
                        <li
                            v-for="file in files"
                            :key="file.identifier"
                            class="py-0.5"
                        >
                            <Checkbox
                                label=""
                                :model-value="selected.has(file.identifier)"
                                @update:model-value="
                                    (checked) =>
                                        toggleFile(file.identifier, checked)
                                "
                            />
                            <a
                                :href="getFileViewUrl(file.identifier)"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-muted hover:underline"
                            >
                                {{ file.name }}
                            </a>
                            (<FileSize :size="file.size" />)
                        </li>
                    </ul>
                </div>
                <div class="py-2">
                    <strong>Important:</strong> Deleted notes can still be
                    recovered for the next 30 days from the time they are
                    deleted.
                    <template v-if="selected.size > 0">
                        Deleted files are removed <strong>permanently</strong>
                        and cannot be recovered.
                    </template>
                </div>
            </template>
        </template>
    </ConfirmDialog>
</template>
