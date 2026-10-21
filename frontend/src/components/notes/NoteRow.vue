<script setup lang="ts">
import { computed } from "vue";
import TreeItemIcon from "@/components/tree/TreeItemIcon.vue";
import { noteNode } from "@/stores/tree";

const props = withDefaults(
    defineProps<{
        note: { id: number; title: string; is_encrypted: boolean | number };
        active?: boolean;
        addClass?: string;
    }>(),
    { active: false, addClass: "" },
);

defineSlots<{
    default(): unknown;
    content?(): unknown;
    actions?(): unknown;
}>();

const iconNode = computed(() => noteNode(props.note));
</script>

<template>
    <div
        :class="[
            'flex items-start gap-3 px-3 py-2.5 cursor-pointer',
            active ? 'bg-sky-700/50' : 'hover:bg-surface-2',
            addClass,
        ]"
    >
        <TreeItemIcon :node="iconNode" add-class="shrink-0 text-muted" />
        <div class="grow min-w-0">
            <div class="truncate">{{ note.title }}</div>
            <slot name="content" />
            <div class="text-xs text-muted">
                <slot />
            </div>
        </div>
        <slot name="actions" />
    </div>
</template>
