<script setup lang="ts">
import { computed } from "vue";
import Icon from "@/components/Icon.vue";
import TimeAgo from "@/components/TimeAgo.vue";
import { useGroupCrumbs } from "@/composables/useNoteCrumbs";
import { useTimeFormat } from "@/composables/useTimeFormat";

const props = withDefaults(
    defineProps<{
        groupId: number | null;
        groupName: string | null;
        lastUpdatedUnix?: number | null;
        author?: string | null;
    }>(),
    { lastUpdatedUnix: null, author: null },
);

const timeFormat = useTimeFormat();
const groupCrumbs = useGroupCrumbs();

const path = computed(() => groupCrumbs(props.groupId, props.groupName));
</script>

<template>
    <div
        class="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-muted pt-1"
    >
        <div v-if="path.length > 0" class="flex items-center gap-1 min-w-0">
            <Icon name="folder" size="sm" />
            <template v-for="(group, index) in path" :key="index">
                <span v-if="index > 0">/</span>
                <button
                    type="button"
                    class="hover:text-fg hover:underline cursor-pointer truncate"
                    :title="`Search in ${group.label}`"
                    @click="group.onClick"
                >
                    {{ group.label }}
                </button>
            </template>
        </div>
        <div
            v-if="lastUpdatedUnix !== null"
            :title="timeFormat.formatDateTime(lastUpdatedUnix)"
        >
            Last updated: <TimeAgo :time="lastUpdatedUnix" />
        </div>
        <div v-if="author">Author: {{ author }}</div>
    </div>
</template>
