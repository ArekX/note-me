<script setup lang="ts">
import ErrorDisplay from "./ErrorDisplay.vue";
import type { ValidationState } from "@/composables/useValidation";

withDefaults(
    defineProps<{
        label?: string;
        name?: string;
        validation?: ValidationState;
        path?: string;
    }>(),
    {
        label: undefined,
        name: undefined,
        validation: undefined,
        path: undefined,
    },
);
</script>

<template>
    <div class="text-fg">
        <label
            v-if="label"
            class="block text-sm font-medium mb-1.5 text-fg"
            :for="name"
        >
            {{ label }}
        </label>
        <slot />
        <ErrorDisplay
            v-if="validation && path"
            :state="validation"
            :path="path"
        />
    </div>
</template>
