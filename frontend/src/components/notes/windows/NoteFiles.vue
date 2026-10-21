<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Button from "@/components/Button.vue";
import Dialog from "@/components/Dialog.vue";
import Loader from "@/components/Loader.vue";
import Skeleton from "@/components/Skeleton.vue";
import { useLoader } from "@/composables/useLoader";
import { useWebsocketService } from "@/composables/useWebsocketService";
import { findFileIdentifiers } from "@/lib/markdown-links";
import { getFileViewUrl } from "@/lib/markdown-snippets";
import { useFilesStore } from "@/stores/files";
import { useToastStore } from "@/stores/toast";
import type {
    GetNoteShareDataMessage,
    GetNoteShareDataResponse,
} from "@/types/messages";
import type { FileMetaRecord } from "@/types/records";

const props = defineProps<{ noteId: number; text: string }>();
const emit = defineEmits<{ close: [] }>();

const { sendMessage } = useWebsocketService();
const filesStore = useFilesStore();
const loader = useLoader(true);
const toggling = useLoader();
const files = ref<FileMetaRecord[]>([]);
const isShared = ref(false);

const hasPrivateFiles = computed(() =>
    files.value.some((file) => !file.is_public),
);

const load = loader.wrap(async () => {
    const share = await sendMessage<
        GetNoteShareDataMessage,
        GetNoteShareDataResponse
    >("notes", "getNoteShareData", {
        data: { note_id: props.noteId },
        expect: "getNoteShareDataResponse",
    });
    isShared.value = share.users.length > 0 || share.links.length > 0;

    const identifiers = findFileIdentifiers(props.text);
    if (identifiers.length > 0) {
        files.value = await filesStore.details(identifiers);
    }
});

const toggleVisibility = toggling.wrap(async () => {
    const isPublic = hasPrivateFiles.value;
    try {
        await filesStore.setManyPublic(
            files.value.map((file) => file.identifier),
            isPublic,
        );
        files.value = files.value.map((file) => ({
            ...file,
            is_public: isPublic,
        }));
    } catch (error) {
        useToastStore().reportError(error);
    }
});

onMounted(load);
</script>

<template>
    <Dialog
        icon="paperclip"
        can-cancel
        title="Files"
        class="w-1/2 max-md:w-full"
        @cancel="emit('close')"
    >
        <Skeleton v-if="loader.running.value" :count="4" class="py-4" />
        <Loader v-else-if="toggling.running.value" color="white" />
        <template v-else-if="files.length > 0">
            <div class="py-4 max-md:text-sm">
                Files are detected in this note. Files marked (Private) are only
                visible to you.
                <p class="pt-2 font-semibold">Files</p>
            </div>
            <ul class="list-disc ml-4">
                <li v-for="file in files" :key="file.identifier">
                    ({{ file.is_public ? "Public" : "Private" }})
                    <a
                        :href="getFileViewUrl(file.identifier)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-muted hover:underline"
                    >
                        {{ file.name }}
                    </a>
                </li>
            </ul>
            <p v-if="isShared && hasPrivateFiles" class="pt-4 text-sm">
                This note is shared with other users. Note that files are not
                automatically shared due for privacy and security reasons as
                they can appear in multiple notes.
            </p>
            <div class="py-4 text-center">
                <Button
                    color="success"
                    add-class="mr-2"
                    @click="toggleVisibility"
                >
                    Make files in this note
                    {{
                        hasPrivateFiles
                            ? "visible to others"
                            : "only visible to you"
                    }}
                </Button>
            </div>
        </template>
        <p v-else>No uploaded file links could be found in this note.</p>

        <template #footer>
            <Button color="primary" @click="emit('close')">Close</Button>
        </template>
    </Dialog>
</template>
