<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import {
    tableOfContentsTool,
    toolGroups,
    type EditorTool,
} from "@/lib/editor-tools";
import {
    insertComponents,
    type InsertComponentId,
} from "./insert/insert-components";

defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{
    tool: [tool: EditorTool];
    insert: [id: InsertComponentId];
}>();
</script>

<template>
    <div
        class="flex flex-wrap items-center gap-1 mt-4 p-1 rounded-lg border border-line bg-field"
        role="toolbar"
        aria-label="Formatting"
    >
        <template v-for="(group, index) in toolGroups" :key="index">
            <span v-if="index > 0" class="separator" />
            <button
                v-for="tool in group"
                :key="tool.label"
                type="button"
                class="tool"
                :title="tool.label"
                :aria-label="tool.label"
                :disabled="disabled"
                @mousedown.prevent
                @click="emit('tool', tool.id)"
            >
                <Icon v-if="tool.icon" :name="tool.icon" size="lg" />
                <span v-else class="text-xs font-bold">{{ tool.text }}</span>
            </button>
        </template>
        <span class="separator" />
        <button
            v-for="item in insertComponents"
            :key="item.id"
            type="button"
            class="tool"
            :title="`${item.name}...`"
            :aria-label="item.name"
            :disabled="disabled"
            @click="emit('insert', item.id)"
        >
            <Icon :name="item.icon" size="lg" />
        </button>
        <button
            type="button"
            class="tool"
            :title="tableOfContentsTool.label"
            :aria-label="tableOfContentsTool.label"
            :disabled="disabled"
            @mousedown.prevent
            @click="emit('tool', tableOfContentsTool.id)"
        >
            <Icon :name="tableOfContentsTool.icon!" size="lg" />
        </button>
    </div>
</template>

<style scoped>
.tool {
    width: 2rem;
    height: 2rem;
    display: grid;
    place-items: center;
    border-radius: 6px;
    color: var(--color-muted);
    cursor: pointer;
}

.tool:hover:not(:disabled) {
    background: var(--color-surface-2);
    color: var(--color-fg);
}

.tool:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.separator {
    width: 1px;
    height: 1.25rem;
    margin: 0 0.25rem;
    background: var(--color-line-strong);
}
</style>
