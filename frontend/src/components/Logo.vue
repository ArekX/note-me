<script setup lang="ts">
withDefaults(
    defineProps<{
        size?: number;
        white?: boolean;
    }>(),
    { size: 32, white: false },
);
</script>

<template>
    <img
        :src="white ? '/logo-white.svg' : '/logo.svg'"
        alt="NoteMe"
        :height="size"
        :width="size"
        class="inline-block"
    />
</template>
