<script setup lang="ts">
import { computed } from "vue";
import { parseMarkdown } from "@/lib/markdown";
import MarkdownNode from "./MarkdownNode.vue";

export interface MarkdownOptions {
    isSharing?: boolean;
}

const props = withDefaults(
    defineProps<{ text?: string; options?: MarkdownOptions }>(),
    { text: "", options: () => ({}) },
);

const root = computed(() => parseMarkdown(props.text));
</script>

<template>
    <div class="markdown-viewer">
        <MarkdownNode
            v-for="(node, index) in root.children"
            :key="index"
            :node="node"
            :original-text="text"
            :options="options"
        />
    </div>
</template>
