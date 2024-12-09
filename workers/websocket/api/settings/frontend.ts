import {
    CreateBackupNowMessage,
    CreateBackupNowResponse,
    CreateBackupTargetMessage,
    CreateBackupTargetResponse,
    DeleteBackupMessage,
    DeleteBackupResponse,
    DeleteBackupTargetMessage,
    DeleteBackupTargetResponse,
    GetBackupsMessage,
    GetBackupsResponse,
    GetBackupTargetsMessage,
    GetBackupTargetsResponse,
    GetPeriodicTasksMessage,
    GetPeriodicTasksResponse,
    SettingsFrontendMessage,
    UpdateBackupTargetMessage,
    UpdateBackupTargetResponse,
} from "$workers/websocket/api/settings/messages.ts";
import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";
import {
    CanManageBackups,
    CanManagePeriodicTasks,
} from "$backend/rbac/permissions.ts";
import { createBackupInputRecord } from "$backend/backups.ts";
import { requireValidSchema } from "$schemas/mod.ts";
import { backupNameSchema, backupTargetSchema } from "$schemas/settings.ts";
import { createBackupHandler } from "$lib/backup-handler/mod.ts";
import { db } from "$workers/database/lib.ts";

const handleGetPeriodicTasks: ListenerFn<GetPeriodicTasksMessage> = async (
    { respond, sourceClient },
) => {
    sourceClient!.auth.require(CanManagePeriodicTasks.View);

    respond<GetPeriodicTasksResponse>({
        type: "getPeriodicTasksResponse",
        tasks: await db.periodicTask.getAllPeriodicTasks(),
    });
};

const handleGetBackups: ListenerFn<GetBackupsMessage> = async (
    { respond, sourceClient, message: { target_id } },
) => {
    sourceClient!.auth.require(CanManageBackups.Update);

    const target = await db.backupTarget.getBackupTarget(target_id);

    if (!target) {
        throw new Error("Target not found");
    }

    const backupHandler = createBackupHandler(target.type, target.settings);

    respond<GetBackupsResponse>({
        type: "getBackupsResponse",
        backups: await backupHandler.listBackups(),
    });
};

const handleCreateBackupNow: ListenerFn<CreateBackupNowMessage> = async (
    { respond, sourceClient, message: { target_id } },
) => {
    sourceClient!.auth.require(CanManageBackups.Update);

    const target = await db.backupTarget.getBackupTarget(target_id);
    if (!target) {
        throw new Error("Target not found");
    }

    if (await db.backupTarget.isBackupInProgress(target_id)) {
        throw new Error("Backup is already in progress");
    }

    const handler = createBackupHandler(target.type, target.settings);

    await db.backupTarget.updateBackupInProgress({
        id: target_id,
        inProgress: true,
    });

    try {
        const item = await handler.saveBackup(
            createBackupInputRecord("manual"),
        );

        await db.backupTarget.updateLastBackupAt(target.id);
        respond<CreateBackupNowResponse>({
            type: "createBackupNowResponse",
            result: {
                success: true,
                target_id,
                backup: item,
            },
        });
    } catch (e: unknown) {
        respond<CreateBackupNowResponse>({
            type: "createBackupNowResponse",
            result: {
                success: false,
                message: (e as Error).message ?? "Unknown message",
            },
        });
    } finally {
        await db.backupTarget.updateBackupInProgress({
            id: target_id,
            inProgress: false,
        });
    }
};

const handleDeleteBackup: ListenerFn<DeleteBackupMessage> = async (
    { respond, sourceClient, message: { identifier, target_id } },
) => {
    sourceClient!.auth.require(CanManageBackups.Update);

    await requireValidSchema(backupNameSchema, { name: identifier });

    const target = await db.backupTarget.getBackupTarget(target_id);

    if (!target) {
        throw new Error("Target not found");
    }

    const handler = createBackupHandler(target.type, target.settings);

    await handler.deleteBackup(identifier);

    respond<DeleteBackupResponse>({
        type: "deleteBackupResponse",
        target_id,
        identifier,
    });
};

const handleCreateBackupTarget: ListenerFn<CreateBackupTargetMessage> = async (
    { respond, sourceClient, message: { target } },
) => {
    sourceClient!.auth.require(CanManageBackups.Update);

    await requireValidSchema(backupTargetSchema, target);

    const record = await db.backupTarget.createBackupTarget(target);

    const handler = createBackupHandler(record.type, record.settings);
    await handler.setup();

    respond<CreateBackupTargetResponse>({
        type: "createBackupTargetResponse",
        record,
    });
};

const handleGetBackupTargets: ListenerFn<GetBackupTargetsMessage> = async (
    { respond, sourceClient },
) => {
    sourceClient!.auth.require(CanManageBackups.Update);

    const targets = await db.backupTarget.getBackupTargets();

    respond<GetBackupTargetsResponse>({
        type: "getBackupTargetsResponse",
        targets,
    });
};

const handleUpdateBackupTarget: ListenerFn<UpdateBackupTargetMessage> = async (
    { respond, sourceClient, message: { target_id, data } },
) => {
    sourceClient!.auth.require(CanManageBackups.Update);

    await requireValidSchema(backupTargetSchema, data);

    if (await db.backupTarget.isBackupInProgress(target_id)) {
        throw new Error("Backup is in progress. Cannot update target");
    }

    await db.backupTarget.updateBackupTarget({
        id: target_id,
        data,
    });

    const handler = createBackupHandler(data.type, data.settings);
    await handler.setup();

    respond<UpdateBackupTargetResponse>({
        type: "updateBackupTargetResponse",
        target_id,
        data,
    });
};

const handleDeleteBackupTarget: ListenerFn<DeleteBackupTargetMessage> = async (
    { respond, sourceClient, message: { target_id } },
) => {
    sourceClient!.auth.require(CanManageBackups.Update);

    if (await db.backupTarget.isBackupInProgress(target_id)) {
        throw new Error("Backup is in progress. Cannot delete target");
    }

    await db.backupTarget.deleteBackupTarget(target_id);

    respond<DeleteBackupTargetResponse>({
        type: "deleteBackupTargetResponse",
        target_id,
    });
};

export const frontendMap: RegisterListenerMap<SettingsFrontendMessage> = {
    getPeriodicTasks: handleGetPeriodicTasks,
    getBackups: handleGetBackups,
    createBackupNow: handleCreateBackupNow,
    deleteBackup: handleDeleteBackup,
    createBackupTarget: handleCreateBackupTarget,
    getBackupTargets: handleGetBackupTargets,
    updateBackupTarget: handleUpdateBackupTarget,
    deleteBackupTarget: handleDeleteBackupTarget,
};
