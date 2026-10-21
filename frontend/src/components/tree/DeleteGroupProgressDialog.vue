<script setup lang="ts">
import Dialog from "@/components/Dialog.vue";
import { useTreeStore } from "@/stores/tree";

const treeStore = useTreeStore();
</script>

<template>
    <Dialog>
        <div class="flex flex-col items-center p-4">
            <div class="text-lg font-bold">
                {{
                    treeStore.deletedCount === null
                        ? "Deleting group and its contents..."
                        : `Deleted ${treeStore.deletedCount} items...`
                }}
            </div>
            <div class="text-sm text-muted">Please wait</div>
        </div>
    </Dialog>
</template>
