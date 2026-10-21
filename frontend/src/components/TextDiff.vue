<script setup lang="ts">
import { computed } from "vue";
import { diffText } from "@/lib/diff";

const props = defineProps<{ text1: string; text2: string }>();

const lines = computed(() => diffText(props.text1, props.text2));
</script>

<template>
    <div class="diff-viewer">
        <div>
            <span class="inline-block mr-2">
                <span class="legend legend-added"></span> Line added
            </span>
            <span class="inline-block mr-2">
                <span class="legend legend-removed"></span> Line removed
            </span>
            <span class="inline-block">
                <span class="legend legend-changed"></span> Line changed
            </span>
        </div>
        <pre class="text-sm whitespace-pre-wrap block pt-10"><template
            v-for="(line, index) in lines"
            :key="index"
        ><div
            v-if="line.type === 'changed'"
            class="diff-changed"
            :title="`From: ${line.from}`"
        >{{ line.to }}</div><div
            v-else
            :class="{
                'diff-added': line.type === 'added',
                'diff-removed': line.type === 'removed',
                'diff-unchanged': line.type === 'same',
            }"
        >{{ line.value }}</div></template></pre>
    </div>
</template>
