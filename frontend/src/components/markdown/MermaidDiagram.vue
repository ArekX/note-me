<script lang="ts">
let counter = 0;
</script>

<script setup lang="ts">
import { ref, watch } from "vue";
import { loadMermaid } from "@/lib/mermaid";

const props = defineProps<{ code: string }>();

const svg = ref<string | null>(null);

watch(
    () => props.code,
    async (code) => {
        try {
            const mermaid = await loadMermaid();
            const result = await mermaid.render(`diagram-${counter++}`, code);
            if (code === props.code) {
                svg.value = result.svg;
            }
        } catch {
            svg.value = null;
        }
    },
    { immediate: true },
);
</script>

<template>
    <!-- securityLevel "strict" and htmlLabels off: labels are SVG text, so the
         SVG holds no HTML from the note. -->
    <div v-if="svg !== null" class="mermaid-diagram" v-html="svg"></div>
    <div v-else class="mermaid-diagram">{{ code }}</div>
</template>
