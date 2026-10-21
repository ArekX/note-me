<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import Button from "@/components/Button.vue";
import Callout from "@/components/Callout.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import Dialog from "@/components/Dialog.vue";
import Icon from "@/components/Icon.vue";
import { useDataExportStore } from "@/stores/data-export";

const dataExport = useDataExportStore();

// Closing the tab or signing out aborts a running export.
const abortOnLeave = () => {
    if (dataExport.isProcessing) {
        void dataExport.cancel();
    }
};

onMounted(() => {
    void dataExport.init();
    addEventListener("beforeunload", abortOnLeave);
});
onBeforeUnmount(() => {
    removeEventListener("beforeunload", abortOnLeave);
    abortOnLeave();
});
</script>

<template>
    <ConfirmDialog
        :visible="dataExport.isConfirmVisible"
        prompt="An export file will be generated containing all of your notes and files. Are you sure you want to proceed?"
        confirm-color="success"
        @confirm="dataExport.answer(true)"
        @cancel="dataExport.answer(false)"
    />

    <Dialog
        v-if="dataExport.isProcessing"
        title="Exporting your data"
        icon="export"
        class="w-[28rem]"
    >
        <p class="text-muted">
            Your data is being exported. This may take a few minutes.
        </p>
        <div class="pt-4">
            <div class="text-sm pb-1.5">
                Progress: {{ dataExport.progress }}%
            </div>
            <progress class="w-full" max="100" :value="dataExport.progress" />
        </div>
        <template #footer>
            <Button @click="dataExport.cancel">Cancel</Button>
        </template>
    </Dialog>

    <Dialog
        v-else-if="dataExport.exportId"
        title="Your data has been exported successfully!"
        icon="check"
        class="w-[28rem]"
    >
        <Callout icon="error">
            <strong>Important:</strong> This is the only place where you can
            download the generated data. Click on the link below to download
            your data. This link will expire in 6 hours.
        </Callout>
        <template #footer>
            <Button @click="dataExport.dismiss">Cancel</Button>
            <Button color="success" @click="dataExport.download">
                <Icon name="download" size="lg" /> Download your data
            </Button>
        </template>
    </Dialog>
</template>
