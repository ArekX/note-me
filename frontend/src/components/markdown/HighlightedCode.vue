<script setup lang="ts">
import { computed } from "vue";
import hljs from "highlight.js";

const props = defineProps<{ language: string; code: string }>();

// highlight.js escapes the code, so its output is safe for v-html.
const highlighted = computed(() =>
    props.language && hljs.getLanguage(props.language)
        ? hljs.highlight(props.code, { language: props.language }).value
        : null,
);
</script>

<template>
    <pre
        v-if="highlighted !== null"
        :class="`lang-${language} overflow-auto`"
        v-html="highlighted"
    ></pre>
    <pre v-else :class="`lang-${language} overflow-auto`">{{ code }}</pre>
</template>
