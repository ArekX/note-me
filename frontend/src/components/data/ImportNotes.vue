<script setup lang="ts">
import { ref } from "vue";
import Button from "@/components/Button.vue";
import Dialog from "@/components/Dialog.vue";
import Icon from "@/components/Icon.vue";
import FileUpload from "@/components/files/FileUpload.vue";
import GroupPicker from "@/components/groups/GroupPicker.vue";
import { useLoader } from "@/composables/useLoader";
import { useNotesStore } from "@/stores/notes";
import { useToastStore } from "@/stores/toast";
import type { TreeRecord } from "@/types/records";

const notesStore = useNotesStore();
const toastStore = useToastStore();
const importing = useLoader();

const isDialogOpen = ref(false);
const selectedGroup = ref<TreeRecord | null>(null);
const doneFiles = ref(0);
const totalFiles = ref(0);

const importFiles = importing.wrap(async (files: File[]) => {
    totalFiles.value = files.length;
    doneFiles.value = 0;

    for (const file of files) {
        try {
            await notesStore.createNote({
                title: file.name,
                text: await file.text(),
                group_id: selectedGroup.value?.id || null,
                is_encrypted: false,
                tags: [],
            });
        } catch (error) {
            toastStore.reportError(
                error,
                `Error while uploading a file ${file.name}: `,
            );
            continue;
        }
        doneFiles.value++;
    }

    isDialogOpen.value = false;
    toastStore.addMessage({ type: "success", text: "File import completed." });
});
</script>

<template>
    <div class="glass-card p-5 flex flex-col items-start gap-3">
        <h3 class="flex items-center gap-2 font-semibold">
            <Icon name="import" size="lg" /> Import notes
        </h3>
        <p class="text-sm text-muted">
            You can import notes by uploading one or more files. Files must be
            in markdown or text format. The contents of the files will be
            imported as new notes.
        </p>
        <Button @click="isDialogOpen = true">
            <Icon name="import" size="lg" /> Import notes
        </Button>

        <Dialog
            v-if="isDialogOpen"
            :can-cancel="!importing.running.value"
            :title="
                importing.running.value ? 'Importing notes' : 'Import notes'
            "
            icon="import"
            class="w-[32rem]"
            @cancel="isDialogOpen = false"
        >
            <div v-if="importing.running.value">
                <p class="pb-3 text-muted">
                    Importing {{ doneFiles }} of {{ totalFiles }} files
                </p>
                <progress class="w-full" :max="totalFiles" :value="doneFiles" />
            </div>
            <div v-else>
                <p class="text-sm font-medium mb-1.5">Group to import into</p>
                <GroupPicker
                    allow-root
                    :selected-id="selectedGroup?.id ?? 0"
                    @pick="selectedGroup = $event"
                />
                <div
                    class="flex flex-col items-center gap-2 mt-4 py-6 px-4 rounded-xl border-2 border-dashed border-line-strong text-muted text-center"
                >
                    <Icon name="cloud-upload" size="4xl" />
                    <span class="text-sm">
                        Markdown or text files become new notes.
                    </span>
                    <FileUpload @files-selected="importFiles" />
                </div>
            </div>
            <template v-if="!importing.running.value" #footer>
                <Button @click="isDialogOpen = false">Cancel</Button>
            </template>
        </Dialog>
    </div>
</template>
