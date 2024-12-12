import { Message } from "$workers/websocket/types.ts";
import { PeriodicTaskRecord } from "$db";
import { BackupIdentifier, BackupItem } from "$lib/backup-handler/mod.ts";
import { BackupTargetRecord } from "$db";
import { BackupTargetRequest } from "$schemas/settings.ts";

type SettingsMessage<Type, Data = unknown> = Message<
    "settings",
    Type,
    Data
>;

export type GetPeriodicTasksMessage = SettingsMessage<
    "getPeriodicTasks"
>;

export type GetPeriodicTasksResponse = SettingsMessage<
    "getPeriodicTasksResponse",
    { tasks: PeriodicTaskRecord[] }
>;

export type GetBackupTargetsMessage = SettingsMessage<
    "getBackupTargets"
>;

export type GetBackupTargetsResponse = SettingsMessage<
    "getBackupTargetsResponse",
    { targets: BackupTargetRecord[] }
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

export type CreateBackupNowResponse = SettingsMessage<
    "createBackupNowResponse",
    {
        result: { success: true; target_id: number; backup: BackupItem } | {
            success: false;
            message: string;
        };
    }
>;

export type DeleteBackupMessage = SettingsMessage<
    "deleteBackup",
    { target_id: number; identifier: BackupIdentifier }
>;

export type DeleteBackupResponse = SettingsMessage<
    "deleteBackupResponse",
    { target_id: number; identifier: BackupIdentifier }
>;

export type SettingsFrontendResponse =
    | GetPeriodicTasksResponse
    | GetBackupsResponse
    | CreateBackupNowResponse
    | DeleteBackupResponse
    | GetBackupTargetsResponse
    | CreateBackupTargetResponse
    | UpdateBackupTargetResponse
    | DeleteBackupTargetResponse;

export type SettingsFrontendMessage =
    | GetPeriodicTasksMessage
    | GetBackupsMessage
    | CreateBackupNowMessage
    | DeleteBackupMessage
    | GetBackupTargetsMessage
    | CreateBackupTargetMessage
    | UpdateBackupTargetMessage
    | DeleteBackupTargetMessage;
