<script setup lang="ts">
import { computed } from "vue";
import type { AstNodeOf } from "@/lib/markdown";

const props = defineProps<{ node: AstNodeOf<"link"> }>();

const SAFE_URL = /^(https?:|mailto:|tel:|ftp:|\/|#|\?|\.{1,2}\/)/i;

const url = computed(() => {
    const raw = props.node.data.url.trim();
    return SAFE_URL.test(raw) ? raw : "#";
});
</script>

<template>
    <a
        class="inline-block"
        :href="url"
        :title="node.data.title"
        :target="url.startsWith('#') ? '_self' : '_blank'"
        rel="noopener noreferrer"
    >
        <slot />
    </a>
</template>
