<script setup lang="ts">
import { ref } from "vue";
import FilePicker from "@/components/files/FilePicker.vue";
import { getFileDownloadUrl, getFileMarkdown } from "@/lib/markdown-snippets";
import type { FileMetaRecord } from "@/types/records";

const emit = defineEmits<{
    insertDataChange: [data: FileMetaRecord[] | null];
    insert: [text: string];
}>();

const selected = ref<FileMetaRecord[]>([]);

const pick = (files: FileMetaRecord[]) => {
    selected.value = files;
    emit("insertDataChange", files.length > 0 ? files : null);
};
</script>

<template>
    <div class="w-[min(64rem,85vw)] max-md:w-full">
        <div class="py-2 max-md:text-sm">
            Please select a file to insert. You can upload a new file or select
            an existing one. Double-click a file to insert it as an image, an
            audio or video player, or a download link, depending on its type, or
            select files and choose how to insert them.
        </div>
        <div v-if="selected.length > 0">
            To be inserted:
            <ul class="list-disc ml-4 block list-inside">
                <li v-for="file in selected" :key="file.identifier">
                    <a
                        :title="`Download ${file.name}`"
                        :href="getFileDownloadUrl(file.identifier)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="underline font-semibold"
                    >
                        {{ file.name }} ({{
                            file.is_public ? "Public" : "Private"
                        }})
                    </a>
                </li>
            </ul>
        </div>
        <FilePicker
            @files-picked="pick"
            @file-activated="emit('insert', getFileMarkdown($event))"
        />
    </div>
</template>
