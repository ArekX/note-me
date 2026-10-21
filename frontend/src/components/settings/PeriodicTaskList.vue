<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import Badge from "@/components/Badge.vue";
import Button from "@/components/Button.vue";
import Icon from "@/components/Icon.vue";
import IconButton from "@/components/IconButton.vue";
import PageHeader from "@/components/PageHeader.vue";
import Table, { type TableColumn } from "@/components/Table.vue";
import TimeAgo from "@/components/TimeAgo.vue";
import PeriodicTaskRunsDialog from "./PeriodicTaskRunsDialog.vue";
import { useDataChanges } from "@/composables/useDataChanges";
import { periodicTaskInfo } from "@/lib/periodic-tasks";
import { CanManagePeriodicTasks } from "@/lib/rbac";
import { useSettingsStore } from "@/stores/settings";
import { useToastStore } from "@/stores/toast";
import { useUserStore } from "@/stores/user";
import type { PeriodicTaskRecord } from "@/types/records";

const REFRESH_MS = 10_000;

const settingsStore = useSettingsStore();
const userStore = useUserStore();
const canRun = computed(() => userStore.can(CanManagePeriodicTasks.Run));
const isLoaded = ref(false);
const viewedTask = ref<string | null>(null);
const starting = ref(new Set<string>());

const columns: TableColumn<PeriodicTaskRecord>[] = [
    { id: "task", name: "Task", cellClass: "min-w-64" },
    { id: "next-run", name: "Next run", cellClass: "whitespace-nowrap" },
    { id: "status", name: "Last run" },
    {
        id: "last-success",
        name: "Last success",
        cellClass: "whitespace-nowrap",
    },
    { id: "fail-reason", name: "Last failure reason" },
    { id: "last-fail", name: "Last failure", cellClass: "whitespace-nowrap" },
    { id: "actions", name: "", cellClass: "text-right" },
];

// Only the first load shows the loader; the 10 s refresh keeps the rows.
const load = async () => {
    try {
        await settingsStore.loadPeriodicTasks();
    } catch (error) {
        useToastStore().reportError(error);
    } finally {
        isLoaded.value = true;
    }
};

const runNow = async (task: PeriodicTaskRecord) => {
    const id = task.task_identifier;
    starting.value = new Set(starting.value).add(id);
    try {
        await settingsStore.runPeriodicTask(id);
        useToastStore().addMessage({
            type: "info",
            text: `${periodicTaskInfo(id).name} will run in a moment.`,
        });
    } catch (error) {
        useToastStore().reportError(error);
    } finally {
        const next = new Set(starting.value);
        next.delete(id);
        starting.value = next;
    }
};

useDataChanges(["periodicTask"], load);

let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
    void load();
    timer = setInterval(load, REFRESH_MS);
});
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
    <div>
        <PageHeader title="Periodic tasks" help="admin-periodic-tasks">
            This screen allows you to see the status of all background periodic
            tasks running in the application along with their last reported
            status. Use the view icon to see a task's recent runs and the play
            icon to run a task right away.
            <template #actions>
                <Button @click="load">
                    <Icon name="refresh" size="lg" /> Refresh
                </Button>
            </template>
        </PageHeader>
        <Table
            :columns="columns"
            :rows="settingsStore.periodicTasks"
            :is-loading="!isLoaded"
            :row-key="(row) => row.task_identifier"
            :skeleton-rows="8"
            no-rows-text="No periodic tasks found"
        >
            <template #cell-task="{ row }">
                <div class="font-medium">
                    {{ periodicTaskInfo(row.task_identifier).name }}
                </div>
                <div
                    v-if="periodicTaskInfo(row.task_identifier).description"
                    class="text-xs text-muted"
                >
                    {{ periodicTaskInfo(row.task_identifier).description }}
                    <span class="whitespace-nowrap block pt-1">
                        Runs:
                        <strong>{{
                            periodicTaskInfo(row.task_identifier).schedule
                        }}</strong
                        >.
                    </span>
                </div>
            </template>
            <template #cell-next-run="{ row }">
                <TimeAgo :time="row.next_run_at" />
            </template>
            <!-- 0.9.w: the original chose the badge by last_successful_run_at. -->
            <template #cell-status="{ row }">
                <span v-if="row.is_last_run_successful === null">
                    No runs yet
                </span>
                <Badge
                    v-else
                    :tone="row.is_last_run_successful ? 'success' : 'danger'"
                >
                    <Icon
                        :name="
                            row.is_last_run_successful
                                ? 'check-circle'
                                : 'x-circle'
                        "
                    />
                    {{ row.is_last_run_successful ? "Successful" : "Failed" }}
                </Badge>
            </template>
            <template #cell-last-success="{ row }">
                <TimeAgo :time="row.last_successful_run_at" />
            </template>
            <template #cell-fail-reason="{ row }">
                {{ row.last_fail_reason || "N/A" }}
            </template>
            <template #cell-last-fail="{ row }">
                <TimeAgo :time="row.last_fail_run_at" />
            </template>
            <template #cell-actions="{ row }">
                <IconButton
                    v-if="canRun"
                    icon="play"
                    title="Run now"
                    :disabled="starting.has(row.task_identifier)"
                    @click="runNow(row)"
                />
                <IconButton
                    icon="show"
                    title="View runs"
                    @click="viewedTask = row.task_identifier"
                />
            </template>
        </Table>
        <PeriodicTaskRunsDialog
            v-if="viewedTask"
            :task-identifier="viewedTask"
            @close="viewedTask = null"
        />
    </div>
</template>
