import { Message } from "$workers/websocket/types.ts";
import { PeriodicTaskRecord } from "$backend/repository/periodic-task-repository.ts";
import { BackupRecord } from "$backend/backups.ts";

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

export type GetBackupsMessage = SettingsMessage<
    "getBackups"
>;

export type GetBackupsResponse = SettingsMessage<
    "getBackupsResponse",
    { backups: BackupRecord[] }
>;

export type DatabaseRestoredMessage = SettingsMessage<
    "databaseRestored"
>;

export type CreateBackupNowMessage = SettingsMessage<
    "createBackupNow"
>;

export type CreateBackupNowResponse = SettingsMessage<
    "createBackupNowResponse",
    { backup: BackupRecord }
>;

export type DeleteBackupMessage = SettingsMessage<
    "deleteBackup",
    { backup: string }
>;

export type DeleteBackupResponse = SettingsMessage<
    "deleteBackupResponse",
    { deleted_backup: string }
>;

export type SettingsFrontendResponse =
    | GetPeriodicTasksResponse
    | GetBackupsResponse
    | CreateBackupNowResponse
    | DeleteBackupResponse;

export type SettingsFrontendMessage =
    | GetPeriodicTasksMessage
    | GetBackupsMessage
    | CreateBackupNowMessage
    | DeleteBackupMessage;
