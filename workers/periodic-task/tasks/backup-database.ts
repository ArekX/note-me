import { logger } from "$backend/logger.ts";
import { PeriodicTask } from "../periodic-task-service.ts";
import { startOfNextDay } from "$workers/periodic-task/next-at.ts";
import { databaseLocation } from "$backend/database.ts";
import {
    getBackupTargets,
    updateBackupInProgress,
    updateLastBackupAt,
} from "$backend/repository/backup-target-repository.ts";
import {
    BackupTargetHandler,
    createBackupHandler,
} from "$lib/backup-handler/mod.ts";
import { TargetType } from "$lib/backup-handler/handlers.ts";
import { createBackupInputRecord } from "$backend/backups.ts";

const removeBackupsOverLimit = async (
    handler: BackupTargetHandler<TargetType>,
) => {
    const currentBackups = (await handler.listBackups())
        .filter((item) => item.identifier.startsWith("automatic-"))
        .sort((a, b) => a.created_at - b.created_at);

    const maxCount = +(Deno.env.get("MAX_BACKUP_COUNT") ?? 5);

    while (currentBackups.length > maxCount) {
        const oldestBackup = currentBackups.shift()!;
        logger.info(`Removing backup ${oldestBackup.identifier}`);
        await handler.deleteBackup(oldestBackup.identifier);
    }
};

export const backupDatabase: PeriodicTask = {
    name: "backup-database",
    getNextAt: startOfNextDay,
    async trigger(): Promise<void> {
        const maxCount = +(Deno.env.get("MAX_BACKUP_COUNT") ?? 5);

        if (maxCount === 0) {
            logger.info(
                "Backup count limit is set to 0, skipping database backup",
            );
            return;
        }

        const targets = await getBackupTargets();

        if (targets.length === 0) {
            logger.info("No backup targets found, skipping database backup");
            return;
        }

        if (databaseLocation === ":memory:") {
            logger.info(
                "Skipping database backup, as the database is in-memory",
            );
            return;
        }

        for (const target of targets) {
            const handler = createBackupHandler(target.type, target.settings);

            logger.info("Backing up the current database to ${target}", {
                target: target.name,
            });

            await updateBackupInProgress(target.id, true);

            try {
                logger.info("Saving backup...");
                await handler.saveBackup(
                    await createBackupInputRecord("automatic"),
                );

                logger.info("Removing old automated backups...");
                await removeBackupsOverLimit(handler);

                await updateLastBackupAt(target.id);
            } catch (e) {
                logger.error(
                    "Error while backing up target '{name}' (ID: {id}): {message}",
                    {
                        name: target.name,
                        id: target.id,
                        message: e.message ?? "Unknown error",
                    },
                );
            } finally {
                await updateBackupInProgress(target.id, false);
            }

            logger.info("Target {target} processing finished...", {
                target: target.name,
            });
        }

        logger.info("Database backup finished.");
    },
};
