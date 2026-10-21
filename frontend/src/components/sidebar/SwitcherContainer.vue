<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import { useResponsiveQuery } from "@/composables/useResponsiveQuery";
import { useSidebar } from "@/composables/useSidebar";

withDefaults(
    defineProps<{
        addClass?: string;
        icons: { name: string; icon: string; onClick: () => void }[];
    }>(),
    { addClass: "" },
);

const query = useResponsiveQuery();
const sidebar = useSidebar();
</script>

<template>
    <div
        :class="[
            'h-14 shrink-0 flex select-none items-center gap-0.5 pl-4 pr-1.5 border-b border-line',
            addClass,
        ]"
    >
        <div class="grow min-w-0 truncate font-semibold">
            <slot />
        </div>
        <button
            v-for="{ name, icon, onClick } in icons"
            :key="name"
            type="button"
            class="panel-action"
            :title="name"
            @click="onClick"
        >
            <Icon :name="icon" size="xl" />
        </button>
        <button
            v-if="!query.isMobile()"
            type="button"
            class="panel-action"
            title="Hide panel"
            @click="sidebar.hide()"
        >
            <Icon name="chevrons-left" size="xl" />
        </button>
    </div>
</template>

<style scoped>
.panel-action {
    width: 2.25rem;
    height: 2.25rem;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border-radius: 8px;
    color: var(--color-muted);
    cursor: pointer;
}

.panel-action:hover {
    background: var(--color-surface-2);
    color: var(--color-fg);
}

@media (pointer: coarse) {
    .panel-action {
        width: 2.75rem;
        height: 2.75rem;
    }
}
</style>
