<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import Button from "@/components/Button.vue";
import Icon from "@/components/Icon.vue";
import PageHeader from "@/components/PageHeader.vue";
import Skeleton from "@/components/Skeleton.vue";
import { useSettingsStore } from "@/stores/settings";
import { useToastStore } from "@/stores/toast";
import { parseAnsi } from "@/lib/ansi";

const REFRESH_MS = 10_000;

const settingsStore = useSettingsStore();
const lines = ref<string[]>([]);
const isLoaded = ref(false);
const output = ref<HTMLElement | null>(null);
const followOutput = ref(true);
const coloredLines = computed(() => lines.value.map(parseAnsi));

const checkScroll = () => {
    const el = output.value;
    if (el) {
        followOutput.value =
            el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
    }
};

const load = async () => {
    try {
        lines.value = await settingsStore.loadServerLog();
    } catch (error) {
        useToastStore().reportError(error);
    } finally {
        isLoaded.value = true;
    }
    await nextTick();
    if (followOutput.value && output.value) {
        output.value.scrollTop = output.value.scrollHeight;
    }
};

let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
    void load();
    timer = setInterval(load, REFRESH_MS);
});
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
    <div>
        <PageHeader title="Server log" help="admin-server-log">
            The most recent lines of the server log, refreshed every 10 seconds.
            Scroll up to pause following the newest lines.
            <template #actions>
                <Button @click="load">
                    <Icon name="refresh" size="lg" /> Refresh
                </Button>
            </template>
        </PageHeader>
        <div
            v-if="!isLoaded"
            class="glass-card p-4 bg-surface-2 border border-line rounded-lg"
        >
            <Skeleton :count="8" />
        </div>
        <pre
            v-else
            ref="output"
            class="glass-card p-4 text-xs leading-5 font-mono text-fg bg-surface-2 border border-line rounded-lg overflow-auto max-h-[70vh] whitespace-pre-wrap break-all"
            @scroll="checkScroll"
        ><template v-if="lines.length === 0">The log is empty.</template
            ><template v-for="(segments, index) in coloredLines" :key="index"
                ><template v-if="index > 0">{{ "\n" }}</template
                ><span
                    v-for="(segment, position) in segments"
                    :key="position"
                    :class="segment.color ?? undefined"
                    >{{ segment.text }}</span
                ></template
            ></pre>
    </div>
</template>
