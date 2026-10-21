import { ref } from "vue";
import { defineStore } from "pinia";
import type { BackupTargetRequest } from "@/schemas/settings";
import type {
    CreateBackupTargetMessage,
    CreateBackupTargetResponse,
    DeleteBackupTargetMessage,
    DeleteBackupTargetResponse,
    GetAuditLogMessage,
    GetAuditLogResponse,
    GetBackupTargetsMessage,
    GetBackupTargetsResponse,
    GetPeriodicTaskRunsMessage,
    GetPeriodicTaskRunsResponse,
    GetPeriodicTasksMessage,
    GetPeriodicTasksResponse,
    GetServerLogMessage,
    GetServerLogResponse,
    RunPeriodicTaskMessage,
    RunPeriodicTaskResponse,
    UpdateBackupTargetMessage,
    UpdateBackupTargetResponse,
} from "@/types/messages";
import type {
    AuditLogFilters,
    BackupTargetRecord,
    PeriodicTaskRecord,
    PeriodicTaskRunOutcome,
} from "@/types/records";
import { useSocketStore } from "./socket";

export const useSettingsStore = defineStore("settings", () => {
    const backupTargets = ref<BackupTargetRecord[]>([]);
    const maxBackupCount = ref<number | null>(null);
    const periodicTasks = ref<PeriodicTaskRecord[]>([]);

    const service = () => useSocketStore().getService();

    const loadBackupTargets = async (): Promise<void> => {
        const response = await (
            await service()
        ).sendMessage<GetBackupTargetsMessage, GetBackupTargetsResponse>(
            "settings",
            "getBackupTargets",
            { expect: "getBackupTargetsResponse" },
        );
        backupTargets.value = response.targets;
        maxBackupCount.value = response.max_backup_count;
    };

    const saveBackupTarget = async (
        id: number | null,
        data: BackupTargetRequest,
    ): Promise<void> => {
        if (id === null) {
            await (
                await service()
            ).sendMessage<
                CreateBackupTargetMessage,
                CreateBackupTargetResponse
            >("settings", "createBackupTarget", {
                data: { target: data },
                expect: "createBackupTargetResponse",
            });
        } else {
            await (
                await service()
            ).sendMessage<
                UpdateBackupTargetMessage,
                UpdateBackupTargetResponse
            >("settings", "updateBackupTarget", {
                data: { target_id: id, data },
                expect: "updateBackupTargetResponse",
            });
        }
        await loadBackupTargets();
    };

    const deleteBackupTarget = async (id: number): Promise<void> => {
        await (
            await service()
        ).sendMessage<DeleteBackupTargetMessage, DeleteBackupTargetResponse>(
            "settings",
            "deleteBackupTarget",
            { data: { target_id: id }, expect: "deleteBackupTargetResponse" },
        );
        await loadBackupTargets();
    };

    const markBackedUp = (id: number, at: number) => {
        const target = backupTargets.value.find((t) => t.id === id);
        if (target) {
            target.last_backup_at = at;
        }
    };

    const loadPeriodicTasks = async (): Promise<void> => {
        const response = await (
            await service()
        ).sendMessage<GetPeriodicTasksMessage, GetPeriodicTasksResponse>(
            "settings",
            "getPeriodicTasks",
            { expect: "getPeriodicTasksResponse" },
        );
        periodicTasks.value = response.tasks;
    };

    const runPeriodicTask = async (taskIdentifier: string) => {
        const response = await (
            await service()
        ).sendMessage<RunPeriodicTaskMessage, RunPeriodicTaskResponse>(
            "settings",
            "runPeriodicTask",
            {
                data: { task_identifier: taskIdentifier },
                expect: "runPeriodicTaskResponse",
            },
        );
        const task = periodicTasks.value.find(
            (item) => item.task_identifier === taskIdentifier,
        );
        if (task) {
            task.next_run_at = response.next_run_at;
        }
    };

    const loadPeriodicTaskRuns = async (
        taskIdentifier: string,
        outcome: PeriodicTaskRunOutcome,
        page: number,
    ) =>
        (await service()).sendMessage<
            GetPeriodicTaskRunsMessage,
            GetPeriodicTaskRunsResponse
        >("settings", "getPeriodicTaskRuns", {
            data: {
                task_identifier: taskIdentifier,
                ...(outcome && { outcome }),
                page,
            },
            expect: "getPeriodicTaskRunsResponse",
        });

    const loadAuditLog = async (filters: AuditLogFilters, page: number) =>
        (await service()).sendMessage<GetAuditLogMessage, GetAuditLogResponse>(
            "settings",
            "getAuditLog",
            { data: { filters, page }, expect: "getAuditLogResponse" },
        );

    const loadServerLog = async (): Promise<string[]> =>
        (
            await (
                await service()
            ).sendMessage<GetServerLogMessage, GetServerLogResponse>(
                "settings",
                "getServerLog",
                { expect: "getServerLogResponse" },
            )
        ).lines;

    return {
        backupTargets,
        maxBackupCount,
        periodicTasks,
        loadBackupTargets,
        saveBackupTarget,
        deleteBackupTarget,
        markBackedUp,
        loadPeriodicTasks,
        runPeriodicTask,
        loadPeriodicTaskRuns,
        loadAuditLog,
        loadServerLog,
    };
});
