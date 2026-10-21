<script setup lang="ts">
import Icon from "./Icon.vue";

withDefaults(
    defineProps<{ tone?: "warning" | "info" | "danger"; icon?: string }>(),
    { tone: "warning", icon: undefined },
);

const tones = {
    warning: "bg-warning-soft",
    info: "bg-accent-soft",
    danger: "bg-danger-soft border border-danger/40",
} as const;

const iconTones = {
    warning: "text-warning",
    info: "text-accent",
    danger: "text-danger",
} as const;
</script>

<template>
    <div
        :class="[
            'flex items-start gap-2.5 px-3.5 py-3 rounded-md text-sm text-fg',
            tones[tone],
        ]"
    >
        <Icon
            v-if="icon"
            :name="icon"
            size="lg"
            :class-name="iconTones[tone]"
        />
        <span><slot /></span>
    </div>
</template>
