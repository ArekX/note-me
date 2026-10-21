<script setup lang="ts">
import { computed } from "vue";
import { parseTableOfContents } from "@/lib/table-of-contents";
import TableOfContentsList from "./TableOfContentsList.vue";

const props = withDefaults(
    defineProps<{
        text: string;
        noTocMessage?: string;
        disableLinks?: boolean;
    }>(),
    {
        noTocMessage: "No table of contents available.",
        disableLinks: false,
    },
);

const items = computed(() => parseTableOfContents(props.text));
</script>

<template>
    <div v-if="items.length > 0">
        <TableOfContentsList :items="items" :disable-links="disableLinks" />
    </div>
    <div v-else class="text-center p-4 text-muted">{{ noTocMessage }}</div>
</template>
