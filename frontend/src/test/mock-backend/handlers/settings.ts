import type {
    CreateBackupNowResponse,
    CreateBackupTargetResponse,
    DeleteBackupResponse,
    DeleteBackupTargetResponse,
    GetAuditLogResponse,
    GetBackupTargetsResponse,
    GetBackupsResponse,
    GetPeriodicTaskRunsResponse,
    GetPeriodicTasksResponse,
    GetServerLogResponse,
    RunPeriodicTaskResponse,
    SettingsFrontendMessage,
    UpdateBackupTargetResponse,
} from "@/types/messages";
import type { BackupTargetRequest } from "@/schemas/settings";
import type { BackupTargetRecord } from "@/types/records";
import {
    CanManagePeriodicTasks,
    CanViewAuditLog,
    CanViewServerLog,
} from "@/lib/rbac";
import {
    contains,
    missingPermission,
    nextId,
    paged,
    type MockHandlerMap,
} from "../handler";
import { now, zipName } from "../state";

// The server never sends S3 secrets back and keeps the stored one when an
// update leaves it empty.
const masked = <T extends BackupTargetRecord | BackupTargetRequest>(
    target: T,
): T =>
    target.type === "s3" && target.settings.credentials.type === "access_key"
        ? {
              ...target,
              settings: {
                  ...target.settings,
                  credentials: {
                      ...target.settings.credentials,
                      secret_access_key: "",
                  },
              },
          }
        : target;

export const settingsHandlers: MockHandlerMap<SettingsFrontendMessage> = {
    getPeriodicTasks: (_m, { state, respond }) =>
        respond<GetPeriodicTasksResponse>("getPeriodicTasksResponse", {
            tasks: state.periodicTasks,
        }),
    runPeriodicTask: ({ task_identifier }, { state, respond, fail }) => {
        const denied = missingPermission(state, CanManagePeriodicTasks.Run);
        if (denied) {
            return fail(denied);
        }
        const task = state.periodicTasks.find(
            (item) => item.task_identifier === task_identifier,
        );
        if (!task) {
            return fail("Periodic task not found.");
        }
        task.next_run_at = now() + 1;
        respond<RunPeriodicTaskResponse>("runPeriodicTaskResponse", {
            task_identifier,
            next_run_at: task.next_run_at,
        });
    },
    getPeriodicTaskRuns: (
        { task_identifier, outcome, page },
        { state, respond },
    ) => {
        const matching = state.periodicTaskRuns.filter(
            (run) =>
                run.task_identifier === task_identifier &&
                (!outcome || run.is_successful === (outcome === "success")),
        );
        respond<GetPeriodicTaskRunsResponse>("getPeriodicTaskRunsResponse", {
            runs: paged(matching, page),
            history_days: 30,
        });
    },
    getAuditLog: ({ filters, page }, { state, respond, fail }) => {
        const denied = missingPermission(state, CanViewAuditLog.View);
        if (denied) {
            return fail(denied);
        }
        const matching = state.auditLog.filter(
            (r) =>
                (!filters.event || r.event === filters.event) &&
                contains(r.username ?? "", filters.username) &&
                (filters.from === undefined || r.created_at >= filters.from) &&
                (filters.to === undefined || r.created_at <= filters.to),
        );
        respond<GetAuditLogResponse>("getAuditLogResponse", {
            records: paged(matching, page),
            events: [...new Set(state.auditLog.map((r) => r.event))].sort(),
        });
    },
    getServerLog: (_m, { state, respond, fail }) => {
        const denied = missingPermission(state, CanViewServerLog.View);
        if (denied) {
            return fail(denied);
        }
        respond<GetServerLogResponse>("getServerLogResponse", {
            lines: [...state.serverLog],
        });
    },
    getBackupTargets: (_m, { state, respond }) =>
        respond<GetBackupTargetsResponse>("getBackupTargetsResponse", {
            targets: state.backupTargets.map(masked),
            max_backup_count: 5,
        }),
    createBackupTarget: ({ target }, { state, respond }) => {
        const t = now();
        const record = {
            id: nextId(state),
            ...target,
            created_at: t,
            updated_at: t,
            last_backup_at: null,
        } as BackupTargetRecord;
        state.backupTargets.push(record);
        state.backups.set(record.id, []);
        respond<CreateBackupTargetResponse>("createBackupTargetResponse", {
            record: masked(record),
        });
    },
    updateBackupTarget: ({ target_id, data }, { state, respond, fail }) => {
        const index = state.backupTargets.findIndex((t) => t.id === target_id);
        if (index === -1) {
            return fail("Backup target not found.");
        }
        const existing = state.backupTargets[index]!;
        const updated = structuredClone(data);
        if (
            updated.type === "s3" &&
            updated.settings.credentials.type === "access_key" &&
            !updated.settings.credentials.secret_access_key &&
            existing.type === "s3" &&
            existing.settings.credentials.type === "access_key"
        ) {
            updated.settings.credentials.secret_access_key =
                existing.settings.credentials.secret_access_key;
        }
        state.backupTargets[index] = {
            ...existing,
            ...updated,
            updated_at: now(),
        } as BackupTargetRecord;
        respond<UpdateBackupTargetResponse>("updateBackupTargetResponse", {
            target_id,
            data: masked(updated),
        });
    },
    deleteBackupTarget: ({ target_id }, { state, respond }) => {
        state.backupTargets = state.backupTargets.filter(
            (t) => t.id !== target_id,
        );
        state.backups.delete(target_id);
        respond<DeleteBackupTargetResponse>("deleteBackupTargetResponse", {
            target_id,
        });
    },
    getBackups: ({ target_id }, { state, respond }) =>
        respond<GetBackupsResponse>("getBackupsResponse", {
            backups: state.backups.get(target_id) ?? [],
        }),
    createBackupNow: ({ target_id }, { state, respond }) => {
        const target = state.backupTargets.find((t) => t.id === target_id);
        if (!target) {
            return respond<CreateBackupNowResponse>("createBackupNowResponse", {
                result: { success: false, message: "Backup target not found." },
            });
        }
        if (target.type === "s3") {
            return respond<CreateBackupNowResponse>("createBackupNowResponse", {
                result: {
                    success: false,
                    message: "S3 offsite: AccessDenied (mock)",
                },
            });
        }
        const name = zipName("manual", now());
        const backup = {
            identifier: name,
            name,
            created_at: now(),
            size: 14_100_000,
        };
        state.backups.get(target_id)?.unshift(backup);
        target.last_backup_at = backup.created_at;
        respond<CreateBackupNowResponse>("createBackupNowResponse", {
            result: { success: true, target_id, backup },
        });
    },
    deleteBackup: ({ target_id, identifier }, { state, respond }) => {
        state.backups.set(
            target_id,
            (state.backups.get(target_id) ?? []).filter(
                (b) => b.identifier !== identifier,
            ),
        );
        respond<DeleteBackupResponse>("deleteBackupResponse", {
            target_id,
            identifier,
        });
    },
};
