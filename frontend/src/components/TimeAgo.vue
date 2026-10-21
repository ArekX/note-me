<script setup lang="ts">
import { computed } from "vue";
import { useTimeFormat } from "@/composables/useTimeFormat";
import { timeAgo } from "@/lib/time-ago";

const props = withDefaults(
    defineProps<{ time?: number | null; emptyText?: string }>(),
    { time: null, emptyText: "N/A" },
);

const timeFormat = useTimeFormat();

const title = computed(() =>
    props.time ? timeFormat.formatDateTime(props.time) : "",
);
</script>

<template>
    <span v-if="time" :title="title">{{ timeAgo(time) }}</span>
    <span v-else>{{ emptyText }}</span>
</template>
