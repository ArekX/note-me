<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Badge from "@/components/Badge.vue";
import ButtonGroup from "@/components/ButtonGroup.vue";
import Dialog from "@/components/Dialog.vue";
import Icon from "@/components/Icon.vue";
import Pagination from "@/components/Pagination.vue";
import Table, { type TableColumn } from "@/components/Table.vue";
import TimeAgo from "@/components/TimeAgo.vue";
import { useLoader } from "@/composables/useLoader";
import { usePagedData } from "@/composables/usePagedData";
import { useTimeFormat } from "@/composables/useTimeFormat";
import { periodicTaskInfo } from "@/lib/periodic-tasks";
import { useSettingsStore } from "@/stores/settings";
import { useToastStore } from "@/stores/toast";
import type {
    PeriodicTaskRunOutcome,
    PeriodicTaskRunRecord,
} from "@/types/records";

const props = defineProps<{ taskIdentifier: string }>();
const emit = defineEmits<{ close: [] }>();

const settingsStore = useSettingsStore();
const timeFormat = useTimeFormat();
const loader = useLoader(true);
const runs = usePagedData<PeriodicTaskRunRecord>(() => load());
const outcome = ref<PeriodicTaskRunOutcome>("");
const historyDays = ref<number | null>(null);

const info = computed(() => periodicTaskInfo(props.taskIdentifier));

const columns: TableColumn<PeriodicTaskRunRecord>[] = [
    { id: "ran-at", name: "Ran at", cellClass: "whitespace-nowrap" },
    { id: "outcome", name: "Outcome" },
    { id: "duration", name: "Duration", cellClass: "text-muted" },
    { id: "fail-reason", name: "Failure reason", cellClass: "break-all" },
];

const outcomes: { id: PeriodicTaskRunOutcome; name: string }[] = [
    { id: "", name: "All" },
    { id: "success", name: "Successful" },
    { id: "failed", name: "Failed" },
];

const formatDuration = (ms: number) => {
    if (ms < 1000) {
        return `${ms} ms`;
    }
    if (ms < 60_000) {
        return `${(ms / 1000).toFixed(1)} s`;
    }
    return `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s`;
};

const load = loader.wrap(async () => {
    try {
        const response = await settingsStore.loadPeriodicTaskRuns(
            props.taskIdentifier,
            outcome.value,
            runs.page.value,
        );
        runs.setPagedData(response.runs);
        historyDays.value = response.history_days;
    } catch (error) {
        useToastStore().reportError(error);
    }
});

const selectOutcome = (value: PeriodicTaskRunOutcome) => {
    outcome.value = value;
    void runs.loadFirstPage();
};

onMounted(load);
</script>

<template>
    <Dialog
        :title="info.name"
        icon="time-five"
        can-cancel
        class="w-[52rem]"
        @cancel="emit('close')"
    >
        <p v-if="info.description" class="text-sm text-muted">
            {{ info.description }}
            <span v-if="info.schedule" class="whitespace-nowrap">
                ({{ info.schedule }})
            </span>
        </p>
        <div
            class="flex flex-wrap items-center justify-between gap-2 pt-4 pb-3"
        >
            <span class="text-sm text-muted">
                <template v-if="historyDays !== null">
                    {{ runs.total.value }}
                    {{ runs.total.value === 1 ? "run" : "runs" }} in the last
                    {{ historyDays }} days
                </template>
            </span>
            <ButtonGroup
                :items="outcomes"
                :active-item="outcome"
                :stretch-on-mobile="false"
                size="sm"
                aria-label="Outcome"
                @select="selectOutcome"
            />
        </div>
        <Table
            :columns="columns"
            :rows="runs.results.value"
            :is-loading="loader.running.value"
            :row-key="(run) => run.id"
            :no-rows-text="
                outcome === 'failed'
                    ? 'No failed runs in this period.'
                    : 'No runs in this period.'
            "
        >
            <template #cell-ran-at="{ row }">
                {{ timeFormat.formatDateTime(row.ran_at) }}
                <span class="text-muted text-xs">
                    (<TimeAgo :time="row.ran_at" />)
                </span>
            </template>
            <template #cell-outcome="{ row }">
                <Badge :tone="row.is_successful ? 'success' : 'danger'">
                    <Icon
                        :name="row.is_successful ? 'check-circle' : 'x-circle'"
                    />
                    {{ row.is_successful ? "Successful" : "Failed" }}
                </Badge>
            </template>
            <template #cell-duration="{ row }">
                {{ formatDuration(row.duration_ms) }}
            </template>
            <template #cell-fail-reason="{ row }">
                {{ row.fail_reason ?? "" }}
            </template>
        </Table>
        <Pagination
            class="mt-3"
            :total="runs.total.value"
            :per-page="runs.perPage.value"
            :current-page="runs.page.value"
            alignment-class="justify-end"
            @change="runs.changePage"
        />
    </Dialog>
</template>
