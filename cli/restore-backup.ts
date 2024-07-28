import { Command } from "$cli/deps.ts";
import { logger } from "$backend/logger.ts";
import {
    getBackups,
    restoreBackup as runRestoreBackup,
} from "$backend/backups.ts";

export const restoreBackup = new Command()
    .description("Restore database from backup")
    .arguments("[backupNumber:number]")
    .action(
        async (
            _options: unknown,
            backupNumber: number | undefined,
        ) => {
            const backups = await getBackups();

            if (
                !backupNumber || backupNumber < 1 ||
                backupNumber > backups.length
            ) {
                logger.error("Invalid backup number");

                logger.info("Available backups:");
                for (const [index, backup] of backups.entries()) {
                    logger.info("{index}: {backup}", {
                        index: index + 1,
                        backup: backup.name,
                    });
                }

                return;
            }

            const backup = backups[backupNumber - 1];

            logger.info("Restoring backup '{backup}'...", {
                backup: backup.name,
            });

            await runRestoreBackup(backup.name);

            logger.info("Backup restored.");
        },
    );
