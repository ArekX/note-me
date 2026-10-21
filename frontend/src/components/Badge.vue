<script setup lang="ts">
withDefaults(
    defineProps<{ tone?: "neutral" | "accent" | "success" | "danger" }>(),
    { tone: "neutral" },
);

const tones = {
    neutral: "bg-surface-2 text-muted",
    accent: "bg-accent-soft text-accent",
    success: "bg-success-soft text-success",
    danger: "bg-danger-soft text-danger",
} as const;
</script>

<template>
    <span
        :class="[
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium',
            tones[tone],
        ]"
        ><slot
    /></span>
</template>
