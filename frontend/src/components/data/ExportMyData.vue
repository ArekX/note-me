<script setup lang="ts">
import Button from "@/components/Button.vue";
import Icon from "@/components/Icon.vue";
import { useDataExportStore } from "@/stores/data-export";

const dataExport = useDataExportStore();
</script>

<template>
    <div class="glass-card p-5 flex flex-col items-start gap-3">
        <h3 class="flex items-center gap-2 font-semibold">
            <Icon name="export" size="lg" /> Data export
        </h3>
        <p class="text-sm text-muted">
            You create an export of all of your notes and files by clicking the
            button below. The export will be a ZIP file containing all of your
            data. This is a process which may take a few minutes to complete
            depending on the amount of data you have.
        </p>

        <Button color="success" @click="dataExport.request">
            <Icon name="export" size="lg" /> Export my data
        </Button>
    </div>
</template>
