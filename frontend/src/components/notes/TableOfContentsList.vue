<script setup lang="ts">
import { getHeadingId } from "@/lib/markdown";
import type { TocItem } from "@/lib/table-of-contents";

defineProps<{ items: TocItem[]; disableLinks: boolean }>();
</script>

<template>
    <ul class="list-disc ml-4">
        <li v-for="(item, index) in items" :key="index">
            <a
                v-if="item.text.length > 0"
                :href="disableLinks ? '#' : `#${getHeadingId(item.text)}`"
                class="text-accent hover:underline"
            >
                {{ item.text }}
            </a>
            <TableOfContentsList
                v-if="item.children.length > 0"
                :items="item.children"
                :disable-links="disableLinks"
            />
        </li>
    </ul>
</template>
