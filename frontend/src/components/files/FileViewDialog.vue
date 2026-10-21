<script setup lang="ts">
import { computed } from "vue";
import Button from "@/components/Button.vue";
import Dialog from "@/components/Dialog.vue";
import Icon from "@/components/Icon.vue";
import TimeAgo from "@/components/TimeAgo.vue";
import FileSize from "./FileSize.vue";
import { useLoader } from "@/composables/useLoader";
import { previewKind } from "@/lib/file-kind";
import { getFileDownloadUrl, getFileViewUrl } from "@/lib/markdown-snippets";
import { useToastStore } from "@/stores/toast";
import { useUserStore } from "@/stores/user";
import type { FileMetaRecord } from "@/types/records";

const props = defineProps<{
    file: FileMetaRecord;
    adminMode: boolean;
    isProcessing: boolean;
}>();
const emit = defineEmits<{ close: []; toggleVisibility: [] }>();

const viewer = computed(() => previewKind(props.file.mime_type));

const url = computed(() => getFileViewUrl(props.file.identifier));

const userStore = useUserStore();
const toastStore = useToastStore();
const settingPicture = useLoader();

// Admins see other users' files, and only an own file can be the picture.
const canBePicture = computed(
    () => viewer.value === "image" && !props.adminMode,
);
const isPicture = computed(
    () => userStore.user?.profile_picture === props.file.identifier,
);

const setAsPicture = settingPicture.wrap(async () => {
    try {
        await userStore.updateProfilePicture(props.file.identifier);
    } catch (error) {
        toastStore.reportError(error, "Failed to set profile picture: ");
        return;
    }
    toastStore.addMessage({ type: "success", text: "Profile picture set." });
});
</script>

<template>
    <Dialog
        icon="file"
        can-cancel
        :title="file.name"
        class="w-[44rem]"
        @cancel="emit('close')"
    >
        <div
            class="grid place-items-center min-h-48 overflow-hidden rounded-md border border-line bg-field"
        >
            <img
                v-if="viewer === 'image'"
                :src="url"
                :alt="file.name"
                class="max-h-96 object-contain"
            />
            <video
                v-else-if="viewer === 'video'"
                controls
                :src="url"
                class="max-h-96"
            />
            <audio
                v-else-if="viewer === 'audio'"
                controls
                :src="url"
                class="w-full p-4"
            />
            <div v-else class="flex flex-col items-center gap-2 text-muted">
                <Icon name="file-blank" size="5xl" />
                <span class="text-sm">No preview available</span>
            </div>
        </div>
        <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm mt-4">
            <dt class="text-muted">Type</dt>
            <dd>{{ file.mime_type || "unknown" }}</dd>
            <dt class="text-muted">Size</dt>
            <dd><FileSize :size="file.size" /></dd>
            <template v-if="adminMode">
                <dt class="text-muted">Owner</dt>
                <dd>{{ file.created_by }}</dd>
            </template>
            <dt class="text-muted">Uploaded</dt>
            <dd><TimeAgo :time="file.created_at" /></dd>
            <dt class="text-muted">Visibility</dt>
            <dd>{{ file.is_public ? "Public" : "Private" }}</dd>
        </dl>
        <template #footer>
            <Button
                v-if="canBePicture"
                :disabled="isPicture || settingPicture.running.value"
                @click="setAsPicture"
            >
                <Icon name="user-circle" size="lg" />
                {{ isPicture ? "Profile picture" : "Set as profile picture" }}
            </Button>
            <Button :disabled="isProcessing" @click="emit('toggleVisibility')">
                <Icon :name="file.is_public ? 'lock-alt' : 'world'" size="lg" />
                {{ file.is_public ? "Make private" : "Make public" }}
            </Button>
            <a :href="url" target="_blank" rel="noopener">
                <Button> <Icon name="link-external" size="lg" /> Open </Button>
            </a>
            <a :href="getFileDownloadUrl(file.identifier)">
                <Button color="success">
                    <Icon name="download" size="lg" /> Download
                </Button>
            </a>
        </template>
    </Dialog>
</template>
