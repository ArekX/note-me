<script setup lang="ts">
import Button from "@/components/Button.vue";
import Dialog from "@/components/Dialog.vue";
import type { FileUploader } from "@/composables/useFileUploader";
import { useToastStore } from "@/stores/toast";

const props = defineProps<{ uploader: FileUploader }>();

const cancel = () => {
    props.uploader.cancelUpload();
    useToastStore().addMessage({ type: "success", text: "Upload cancelled" });
};
</script>

<template>
    <Dialog
        v-if="uploader.isUploading.value"
        title="Uploading files"
        icon="upload"
    >
        <p class="pb-3 text-sm text-muted">
            {{ uploader.donePercentage.value }}% uploaded
        </p>
        <progress
            class="w-full"
            :max="uploader.totalSize.value"
            :value="uploader.uploadedSize.value"
        />
        <template #footer>
            <Button @click="cancel">Cancel</Button>
        </template>
    </Dialog>
</template>
