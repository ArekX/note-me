<script setup lang="ts" generic="Data = unknown">
import type { Component } from "vue";
import Button from "./Button.vue";
import Icon from "./Icon.vue";
import { useResponsiveQuery } from "@/composables/useResponsiveQuery";

export interface PanelItem<Data = unknown> {
    key: string;
    name: string;
    subtitle?: string;
    icon?: string;
    data?: Data;
    component: Component;
}

withDefaults(
    defineProps<{
        items: PanelItem<Data>[];
        selectedIndex: number;
        addPanelClass?: string;
        desktopHeight?: string;
        toggleLabel?: string;
        passProps?: Record<string, unknown>;
    }>(),
    {
        addPanelClass: "",
        desktopHeight: "calc(100vh - 208px)",
        toggleLabel: undefined,
        passProps: () => ({}),
    },
);

const isMobileOpen = defineModel<boolean>("mobileOpen", { default: false });

const emit = defineEmits<{
    select: [item: PanelItem<Data>, index: number];
}>();

defineSlots<{ subtitle?(props: { item: PanelItem<Data> }): unknown }>();

const query = useResponsiveQuery();

const select = (item: PanelItem<Data>, index: number) => {
    isMobileOpen.value = false;
    emit("select", item, index);
};
</script>

<template>
    <div v-if="toggleLabel && query.isMobile()" class="text-right py-2">
        <Button color="success" @click="isMobileOpen = !isMobileOpen">
            <Icon name="menu" size="sm" /> {{ toggleLabel }}
        </Button>
    </div>
    <div
        class="relative"
        :style="
            query.min('md') ? { height: desktopHeight } : { minHeight: '200px' }
        "
    >
        <div
            v-if="isMobileOpen || query.min('md')"
            class="absolute top-0 left-0 bottom-0 right-3/4 max-md:right-0 max-md:left-1/4 max-md:border-l md:border-r border-line py-2 pr-2 max-md:pl-2 overflow-auto z-20 bg-menu"
        >
            <div
                v-for="(item, index) in items"
                :key="item.key"
                data-test="side-tab-item"
                :class="[
                    'w-full mb-0.5 last:mb-0 px-3 py-2 rounded-md cursor-pointer',
                    index === selectedIndex
                        ? 'bg-accent-soft text-accent pointer-events-none'
                        : 'hover:bg-surface-2',
                ]"
                @click="index !== selectedIndex && select(item, index)"
            >
                <h1 class="text-sm font-medium">
                    <Icon
                        v-if="item.icon"
                        :name="item.icon"
                        class-name="mr-1.5"
                    />
                    {{ item.name }}
                </h1>
                <span class="block text-xs text-muted">
                    <slot name="subtitle" :item="item">
                        {{ item.subtitle ?? "" }}
                    </slot>
                </span>
            </div>
        </div>
        <div
            :class="[
                'md:left-1/4 md:right-0 md:top-0 md:bottom-0 md:absolute md:pl-5 overflow-auto',
                addPanelClass,
            ]"
        >
            <component
                :is="items[selectedIndex]?.component"
                v-if="items[selectedIndex]"
                :key="items[selectedIndex]?.key"
                v-bind="passProps"
            />
        </div>
    </div>
</template>
