import {
    CreateBackupNowMessage,
    CreateBackupNowResponse,
    DeleteBackupMessage,
    DeleteBackupResponse,
    GetBackupsMessage,
    GetBackupsResponse,
    GetPeriodicTasksMessage,
    GetPeriodicTasksResponse,
    GetSettingsMessage,
    GetSettingsResponse,
    SettingsFrontendMessage,
    UpdateSettingsMessage,
    UpdateSettingsResponse,
} from "$workers/websocket/api/settings/messages.ts";
import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";
import { getAllPeriodicTasks } from "$backend/repository/periodic-task-repository.ts";
import {
    CanManageBackups,
    CanManagePeriodicTasks,
} from "$backend/rbac/permissions.ts";
import { CanManageSettings } from "$backend/rbac/permissions.ts";
import {
    getPartialSettings,
    getSettings,
    Settings,
    updateSettings,
} from "$backend/repository/settings-repository.ts";
import { createNewBackup, deleteBackup, getBackups } from "$backend/backups.ts";
import { requireValidSchema } from "$schemas/mod.ts";
import { backupNameSchema, getSettingsSchema } from "$schemas/settings.ts";

const handleGetPeriodicTasks: ListenerFn<GetPeriodicTasksMessage> = async (
    { respond, sourceClient },
) => {
    sourceClient!.auth.require(CanManagePeriodicTasks.View);

    respond<GetPeriodicTasksResponse>({
        type: "getPeriodicTasksResponse",
        tasks: await getAllPeriodicTasks(),
    });
};

const handleGetSettings: ListenerFn<GetSettingsMessage> = async (
    { message, respond, sourceClient },
) => {
    sourceClient!.auth.require(CanManageSettings.Update);

    await requireValidSchema(getSettingsSchema, message);

    respond<GetSettingsResponse>({
        type: "getSettingsResponse",
        settings: (message.keys
            ? await getPartialSettings(message.keys)
            : await getSettings()) as Partial<Settings>,
    });
};

const handleUpdateSettings: ListenerFn<UpdateSettingsMessage> = async (
    { respond, sourceClient, message: { settings } },
) => {
    sourceClient!.auth.require(CanManageSettings.Update);

    await updateSettings(settings);

    respond<UpdateSettingsResponse>({
        type: "updateSettingsResponse",
        updated_settings: settings,
    });
};

const handleGetBackups: ListenerFn<GetBackupsMessage> = async (
    { respond, sourceClient },
) => {
    sourceClient!.auth.require(CanManageBackups.Update);

    const backupFiles = await getBackups();

    respond<GetBackupsResponse>({
        type: "getBackupsResponse",
        backups: backupFiles,
    });
};

const handleCreateBackupNow: ListenerFn<CreateBackupNowMessage> = async (
    { respond, sourceClient },
) => {
    sourceClient!.auth.require(CanManageBackups.Update);

    const backup = await createNewBackup("manual");

    respond<CreateBackupNowResponse>({
        type: "createBackupNowResponse",
        backup,
    });
};

const handleDeleteBackup: ListenerFn<DeleteBackupMessage> = async (
    { respond, sourceClient, message: { backup } },
) => {
    sourceClient!.auth.require(CanManageBackups.Update);

    await requireValidSchema(backupNameSchema, { name: backup });

    await deleteBackup(backup);

    respond<DeleteBackupResponse>({
        type: "deleteBackupResponse",
        deleted_backup: backup,
    });
};

export const frontendMap: RegisterListenerMap<SettingsFrontendMessage> = {
    getPeriodicTasks: handleGetPeriodicTasks,
    getSettings: handleGetSettings,
    updateSettings: handleUpdateSettings,
    getBackups: handleGetBackups,
    createBackupNow: handleCreateBackupNow,
    deleteBackup: handleDeleteBackup,
};
