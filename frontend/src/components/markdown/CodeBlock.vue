<script setup lang="ts">
import { computed } from "vue";
import { nodeText, type AstNodeOf } from "@/lib/markdown";
import HighlightedCode from "./HighlightedCode.vue";
import MermaidDiagram from "./MermaidDiagram.vue";

const props = defineProps<{ node: AstNodeOf<"codeBlock"> }>();

const code = computed(() => nodeText(props.node));
</script>

<template>
    <MermaidDiagram v-if="node.data.language === 'mermaid'" :code="code" />
    <HighlightedCode v-else :language="node.data.language" :code="code" />
</template>
