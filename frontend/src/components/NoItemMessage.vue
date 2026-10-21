<script setup lang="ts">
import Icon from "./Icon.vue";

withDefaults(defineProps<{ icon: string; removePadding?: boolean }>(), {
    removePadding: false,
});
</script>

<template>
    <div :class="['text-muted', removePadding ? '' : 'pt-14', 'text-center']">
        <div class="mb-2">
            <Icon :name="icon" size="5xl" />
        </div>
        <slot />
    </div>
</template>
