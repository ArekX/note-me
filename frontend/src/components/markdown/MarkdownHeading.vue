<script setup lang="ts">
import { computed } from "vue";
import { getHeadingId, nodeText, type AstNodeOf } from "@/lib/markdown";

const props = defineProps<{ node: AstNodeOf<"heading"> }>();

const tag = computed(() => `h${Math.min(props.node.data.level, 6)}`);
const id = computed(() => getHeadingId(nodeText(props.node)));
</script>

<template>
    <component :is="tag" :id="id">
        <slot />
    </component>
</template>
