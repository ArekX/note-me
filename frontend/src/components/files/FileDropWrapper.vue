<script setup lang="ts">
import { ref } from "vue";

withDefaults(defineProps<{ wrapperClass?: string }>(), { wrapperClass: "" });
const emit = defineEmits<{ filesDropped: [files: File[]] }>();

const isDropping = ref(false);

const dragOver = (event: DragEvent) => {
    if (!event.dataTransfer?.types.includes("Files")) {
        return;
    }
    event.preventDefault();
    isDropping.value = true;
};

const drop = (event: DragEvent) => {
    isDropping.value = false;
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length === 0) {
        return;
    }
    event.preventDefault();
    emit("filesDropped", files);
};
</script>

<template>
    <div :class="[wrapperClass, 'relative']" @dragover="dragOver" @drop="drop">
        <div
            v-if="isDropping"
            class="absolute top-0 left-0 w-full h-full bg-black/50 flex items-center justify-center z-40"
            @dragleave.prevent="isDropping = false"
        >
            <p class="text-white text-2xl">Drop files to upload</p>
        </div>
        <slot />
    </div>
</template>
