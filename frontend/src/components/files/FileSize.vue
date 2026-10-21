<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ size: number }>();

const label = computed(() => {
    if (props.size < 1024) {
        return `${props.size} bytes`;
    }
    if (props.size < 1024 * 1024) {
        return `${(props.size / 1024).toFixed(2)} KB`;
    }
    return `${(props.size / 1024 / 1024).toFixed(2)} MB`;
});
</script>

<template>
    <span :title="`${size} bytes`">{{ label }}</span>
</template>
