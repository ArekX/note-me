<script setup lang="ts">
import { computed } from "vue";

export type IconSize =
    "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";

const iconSettings: Record<string, { modifier: string }> = {
    markdown: { modifier: "l" },
};

const props = withDefaults(
    defineProps<{
        name: string;
        type?: "regular" | "solid" | "logo";
        size?: IconSize;
        className?: string;
        animation?:
            | "spin"
            | "tada"
            | "flashing"
            | "burst"
            | "fade-left"
            | "fade-right"
            | "fade-up"
            | "fade-down";
    }>(),
    { type: "regular", size: "2xl", className: "", animation: undefined },
);

const modifier = computed(() => {
    if (props.type === "solid") {
        return "s";
    }
    if (props.type === "logo") {
        return "l";
    }
    return iconSettings[props.name]?.modifier ?? "";
});
</script>

<template>
    <i
        :class="[
            'bx',
            `bx${modifier}-${name}`,
            `text-${size}`,
            animation ? `bx-${animation}` : '',
            'align-middle',
            className,
        ]"
    ></i>
</template>
