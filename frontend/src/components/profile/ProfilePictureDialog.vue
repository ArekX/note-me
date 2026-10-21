<script setup lang="ts">
import { computed, ref } from "vue";
import Button from "@/components/Button.vue";
import Dialog from "@/components/Dialog.vue";
import FilePicker from "@/components/files/FilePicker.vue";
import { useLoader } from "@/composables/useLoader";
import { fileKind } from "@/lib/file-kind";
import { useToastStore } from "@/stores/toast";
import { useUserStore } from "@/stores/user";
import type { FileMetaRecord } from "@/types/records";

const emit = defineEmits<{ close: [] }>();

const userStore = useUserStore();
const toastStore = useToastStore();
const saving = useLoader();
const selected = ref<FileMetaRecord[]>([]);

const picture = computed(() => {
    const [file, ...others] = selected.value;
    return file && others.length === 0 && fileKind(file.mime_type) === "image"
        ? file
        : null;
});

const use = saving.wrap(async (file: FileMetaRecord | null) => {
    if (!file || fileKind(file.mime_type) !== "image") {
        return;
    }
    try {
        await userStore.updateProfilePicture(file.identifier);
    } catch (error) {
        toastStore.reportError(error, "Failed to set profile picture: ");
        return;
    }
    toastStore.addMessage({ type: "success", text: "Profile picture set." });
    emit("close");
});
</script>

<template>
    <Dialog
        can-cancel
        icon="image"
        title="Choose profile picture"
        @cancel="emit('close')"
    >
        <div class="w-[min(64rem,85vw)] max-md:w-full">
            <div class="py-2 max-md:text-sm">
                Pick one of your images or upload a new one. Double-click an
                image to use it right away.
            </div>
            <FilePicker
                kind="image"
                @files-picked="selected = $event"
                @file-activated="use"
            />
        </div>
        <template #footer>
            <Button @click="emit('close')">Cancel</Button>
            <Button
                color="success"
                :disabled="!picture || saving.running.value"
                @click="use(picture)"
            >
                Use as profile picture
            </Button>
        </template>
    </Dialog>
</template>
