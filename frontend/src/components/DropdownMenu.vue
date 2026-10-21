<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import Button, { type ButtonColor, type ButtonSize } from "./Button.vue";
import Icon, { type IconSize } from "./Icon.vue";
import { useSinglePopover } from "@/composables/useSinglePopover";
import { useWindowResize } from "@/composables/useWindowResize";

export interface DropdownMenuItem {
    name: string;
    icon: string;
    onClick: () => void;
}

const props = withDefaults(
    defineProps<{
        popoverId: string;
        items: DropdownMenuItem[];
        label?: string;
        icon?: string;
        iconSize?: IconSize;
        iconOnly?: boolean;
        roundedButton?: boolean;
        buttonBorderClass?: string;
        buttonSize?: ButtonSize;
        buttonColor?: ButtonColor;
        addButtonClass?: string;
        displayType?: "portal" | "inline";
        inlineDirection?: "left" | "right" | "top";
        showDirection?: "right" | "left" | "bottom";
    }>(),
    {
        label: "",
        icon: "chevron-down",
        iconSize: "md",
        iconOnly: false,
        roundedButton: true,
        buttonBorderClass: undefined,
        buttonSize: "md",
        buttonColor: "primary",
        addButtonClass: "",
        displayType: "inline",
        inlineDirection: "right",
        showDirection: "bottom",
    },
);

const menu = ref<HTMLElement | null>(null);
const button = ref<HTMLElement | null>(null);

const { isOpen, open, close } = useSinglePopover(() => props.popoverId, menu);

const inlineClass = computed(() => {
    if (props.displayType !== "inline") {
        return "";
    }
    if (props.inlineDirection === "right") {
        return "top-full right-0";
    }
    if (props.inlineDirection === "top") {
        return "bottom-full mb-2 right-0";
    }
    return "top-full";
});

// A portal menu is fixed to the viewport, so it is placed next to the button
// and pushed up when it would run past the bottom edge.
const reposition = () => {
    if (props.displayType !== "portal" || !menu.value || !button.value) {
        return;
    }

    const menuRect = menu.value.getBoundingClientRect();
    const buttonRect = button.value.getBoundingClientRect();
    const overflow = Math.max(
        0,
        buttonRect.top + menuRect.height - innerHeight,
    );

    if (props.showDirection === "right") {
        menu.value.style.top = `${buttonRect.top - overflow}px`;
        menu.value.style.left = `${buttonRect.right}px`;
    } else if (props.showDirection === "left") {
        menu.value.style.top = `${buttonRect.top - overflow}px`;
        menu.value.style.left = `${buttonRect.left - menuRect.width}px`;
    } else {
        menu.value.style.top = `${buttonRect.bottom}px`;
        menu.value.style.left = `${buttonRect.left}px`;
    }
};

watch(isOpen, async (opened) => {
    if (opened) {
        await nextTick();
        reposition();
    }
});

useWindowResize(reposition);

const toggle = () => (isOpen.value ? close() : open());

const pick = (item: DropdownMenuItem) => {
    item.onClick();
    close();
};

defineExpose({ isOpen });
</script>

<template>
    <div v-if="items.length > 0" :class="['relative', addButtonClass]">
        <span
            v-if="iconOnly"
            ref="button"
            class="cursor-pointer"
            @click.stop="toggle"
        >
            <Icon :name="icon" size="3xl" />
        </span>
        <div v-else ref="button">
            <Button
                :color="buttonColor"
                :size="buttonSize"
                :rounded="roundedButton"
                :border-class="buttonBorderClass"
                @click.stop="toggle"
            >
                <slot name="label">{{ label }}</slot>
                <Icon :name="icon" :size="iconSize" />
            </Button>
        </div>

        <Teleport to="#icon-menu" :disabled="displayType !== 'portal'">
            <div
                v-if="isOpen"
                ref="menu"
                :class="[
                    'text-fg text-sm mt-1 z-50 p-1 min-w-48 popup-menu rounded-[10px] whitespace-nowrap break-keep overscroll-none',
                    displayType === 'portal' ? 'fixed' : 'absolute',
                    inlineClass,
                ]"
            >
                <div
                    v-for="item in items"
                    :key="item.name"
                    class="flex items-center gap-2.5 h-9 px-2.5 rounded-md hover:bg-surface-2 cursor-pointer text-left"
                    @click.stop.prevent="pick(item)"
                >
                    <Icon :name="item.icon" size="xl" class-name="text-muted" />
                    {{ item.name }}
                </div>
            </div>
        </Teleport>
    </div>
</template>
