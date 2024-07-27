import {
    DatabaseRestoredMessage,
    GetBackupsMessage,
    GetBackupsResponse,
    GetPeriodicTasksMessage,
    GetPeriodicTasksResponse,
    GetSettingsMessage,
    GetSettingsResponse,
    RestoreBackupMessage,
    RestoreBackupResponse,
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
import { getBackups, restoreBackup } from "$backend/backups.ts";
import { workerSendMesage } from "$workers/services/worker-bus.ts";
import { createBackendMessage } from "$workers/websocket/websocket-backend.ts";
import { requireValidSchema } from "$schemas/mod.ts";
import { getSettingsSchema } from "$schemas/settings.ts";

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
    sourceClient!.auth.require(CanManageBackups.Restore);

    const backupFiles = await getBackups();

    respond<GetBackupsResponse>({
        type: "getBackupsResponse",
        backups: backupFiles,
    });
};

const handleRestoreBackup: ListenerFn<RestoreBackupMessage> = async (
    { respond, sourceClient, message: { backup } },
) => {
    sourceClient!.auth.require(CanManageBackups.Restore);

    await restoreBackup(backup);

    workerSendMesage(
        "*",
        createBackendMessage<DatabaseRestoredMessage>(
            "settings",
            "databaseRestored",
            {},
        ),
    );

    respond<RestoreBackupResponse>({
        type: "restoreBackupResponse",
        restored_backup: backup,
    });
};

export const frontendMap: RegisterListenerMap<SettingsFrontendMessage> = {
    getPeriodicTasks: handleGetPeriodicTasks,
    getSettings: handleGetSettings,
    updateSettings: handleUpdateSettings,
    getBackups: handleGetBackups,
    restoreBackup: handleRestoreBackup,
};
