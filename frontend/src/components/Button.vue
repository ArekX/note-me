<script setup lang="ts">
import { computed } from "vue";

const buttonColors = {
    primary:
        "bg-surface-2 border-line text-fg enabled:hover:border-line-strong enabled:hover:bg-white/12",
    warning:
        "bg-warning-soft border-transparent text-warning enabled:hover:bg-warning/25",
    success:
        "bg-accent border-transparent text-accent-ink font-semibold enabled:hover:brightness-110",
    successDisabled:
        "bg-accent/50 border-transparent text-accent-ink font-semibold",
    danger: "bg-danger border-transparent text-white enabled:hover:brightness-110",
    transparent:
        "bg-transparent border-transparent text-muted enabled:hover:bg-surface-2 enabled:hover:text-fg",
    transparentDanger:
        "bg-transparent border-transparent text-muted enabled:hover:bg-danger-soft enabled:hover:text-danger",
} as const;

const sizeTypes = {
    xs: "h-7 px-2 text-xs",
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 text-sm",
} as const;

export type ButtonColor = keyof typeof buttonColors;
export type ButtonSize = keyof typeof sizeTypes;

const props = withDefaults(
    defineProps<{
        color?: ButtonColor;
        size?: ButtonSize;
        type?: "button" | "submit";
        title?: string;
        name?: string;
        disabled?: boolean;
        rounded?: boolean;
        addPadding?: boolean;
        borderClass?: string;
        addClass?: string;
        tabIndex?: number;
    }>(),
    {
        color: "primary",
        size: "md",
        type: "button",
        title: "",
        name: undefined,
        disabled: false,
        rounded: true,
        addPadding: true,
        borderClass: undefined,
        addClass: "",
        tabIndex: undefined,
    },
);

const emit = defineEmits<{
    click: [event: MouseEvent];
    keydown: [event: KeyboardEvent];
}>();

const classes = computed(() => [
    props.borderClass ?? "border",
    "border-solid inline-flex items-center justify-center gap-1.5 font-medium whitespace-nowrap",
    props.addPadding ? sizeTypes[props.size] : "",
    buttonColors[props.color],
    props.rounded ? "rounded-lg" : "",
    "transition disabled:opacity-45 disabled:cursor-not-allowed enabled:active:scale-97 cursor-pointer",
    props.addClass,
]);

const handleClick = (event: MouseEvent) => {
    if (!props.disabled) {
        emit("click", event);
    }
};
</script>

<template>
    <button
        :type="type"
        :title="title"
        :disabled="disabled"
        :name="name"
        :tabindex="tabIndex"
        :class="classes"
        @click="handleClick"
        @keydown="emit('keydown', $event)"
    >
        <slot />
    </button>
</template>
