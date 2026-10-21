import type { Message } from "./base";
import type {
    AuditLogFilters,
    AuditLogRecord,
    BackupIdentifier,
    BackupItem,
    BackupTargetRecord,
    Paged,
    PeriodicTaskRecord,
    PeriodicTaskRunOutcome,
    PeriodicTaskRunRecord,
} from "../records";
import type { BackupTargetRequest } from "@/schemas/settings";

type SettingsMessage<Type extends string, Data = unknown> = Message<
    "settings",
    Type,
    Data
>;

export type GetPeriodicTasksMessage = SettingsMessage<"getPeriodicTasks">;
export type GetPeriodicTasksResponse = SettingsMessage<
    "getPeriodicTasksResponse",
    { tasks: PeriodicTaskRecord[] }
>;

// Not in the original app.
export type RunPeriodicTaskMessage = SettingsMessage<
    "runPeriodicTask",
    { task_identifier: string }
>;
export type RunPeriodicTaskResponse = SettingsMessage<
    "runPeriodicTaskResponse",
    { task_identifier: string; next_run_at: number }
>;

export type GetPeriodicTaskRunsMessage = SettingsMessage<
    "getPeriodicTaskRuns",
    { task_identifier: string; outcome?: PeriodicTaskRunOutcome; page: number }
>;
// history_days is PERIODIC_TASK_HISTORY_DAYS; older runs are removed.
export type GetPeriodicTaskRunsResponse = SettingsMessage<
    "getPeriodicTaskRunsResponse",
    { runs: Paged<PeriodicTaskRunRecord>; history_days: number }
>;

export type GetBackupTargetsMessage = SettingsMessage<"getBackupTargets">;
// max_backup_count is MAX_ALLOWED_BACKUP_COUNT; 0 disables backups.
export type GetBackupTargetsResponse = SettingsMessage<
    "getBackupTargetsResponse",
    { targets: BackupTargetRecord[]; max_backup_count: number }
>;

export type CreateBackupTargetMessage = SettingsMessage<
    "createBackupTarget",
    { target: BackupTargetRequest }
>;
export type CreateBackupTargetResponse = SettingsMessage<
    "createBackupTargetResponse",
    { record: BackupTargetRecord }
>;

export type UpdateBackupTargetMessage = SettingsMessage<
    "updateBackupTarget",
    { target_id: number; data: BackupTargetRequest }
>;
export type UpdateBackupTargetResponse = SettingsMessage<
    "updateBackupTargetResponse",
    { target_id: number; data: BackupTargetRequest }
>;

export type DeleteBackupTargetMessage = SettingsMessage<
    "deleteBackupTarget",
    { target_id: number }
>;
export type DeleteBackupTargetResponse = SettingsMessage<
    "deleteBackupTargetResponse",
    { target_id: number }
>;

export type GetBackupsMessage = SettingsMessage<
    "getBackups",
    { target_id: number }
>;
export type GetBackupsResponse = SettingsMessage<
    "getBackupsResponse",
    { backups: BackupItem[] }
>;

export type CreateBackupNowMessage = SettingsMessage<
    "createBackupNow",
    { target_id: number }
>;
export type CreateBackupNowResult =
    | { success: true; target_id: number; backup: BackupItem }
    | { success: false; message: string };
export type CreateBackupNowResponse = SettingsMessage<
    "createBackupNowResponse",
    { result: CreateBackupNowResult }
>;

export type DeleteBackupMessage = SettingsMessage<
    "deleteBackup",
    { target_id: number; identifier: BackupIdentifier }
>;
export type DeleteBackupResponse = SettingsMessage<
    "deleteBackupResponse",
    { target_id: number; identifier: BackupIdentifier }
>;

export type GetAuditLogMessage = SettingsMessage<
    "getAuditLog",
    { filters: AuditLogFilters; page: number }
>;
// 20 per page, newest first; events holds every distinct event for the
// filter dropdown.
export type GetAuditLogResponse = SettingsMessage<
    "getAuditLogResponse",
    { records: Paged<AuditLogRecord>; events: string[] }
>;

export type GetServerLogMessage = SettingsMessage<"getServerLog">;
// Oldest first, at most 1000 lines.
export type GetServerLogResponse = SettingsMessage<
    "getServerLogResponse",
    { lines: string[] }
>;

export type SettingsFrontendMessage =
    | GetPeriodicTasksMessage
    | RunPeriodicTaskMessage
    | GetPeriodicTaskRunsMessage
    | GetAuditLogMessage
    | GetServerLogMessage
    | GetBackupsMessage
    | CreateBackupNowMessage
    | DeleteBackupMessage
    | GetBackupTargetsMessage
    | CreateBackupTargetMessage
    | UpdateBackupTargetMessage
    | DeleteBackupTargetMessage;

export type SettingsFrontendResponse =
    | GetPeriodicTasksResponse
    | RunPeriodicTaskResponse
    | GetPeriodicTaskRunsResponse
    | GetAuditLogResponse
    | GetServerLogResponse
    | GetBackupsResponse
    | CreateBackupNowResponse
    | DeleteBackupResponse
    | GetBackupTargetsResponse
    | CreateBackupTargetResponse
    | UpdateBackupTargetResponse
    | DeleteBackupTargetResponse;
