import { logger } from "$backend/logger.ts";
import { PeriodicTask } from "../periodic-task-service.ts";
import { startOfNextDay } from "$workers/periodic-task/next-at.ts";
import { databaseLocation } from "$backend/database.ts";
import {
    getMultiSettingsValue,
} from "$backend/repository/settings-repository.ts";
import { createNewBackup, removeOldBackups } from "$backend/backups.ts";

export const backupDatabase: PeriodicTask = {
    name: "backup-database",
    getNextAt: startOfNextDay,
    async trigger(): Promise<void> {
        const [isEnabled, maxBackupDays] = await getMultiSettingsValue([
            "is_auto_backup_enabled",
            "max_backup_days",
        ]);

        if (!isEnabled) {
            logger.info("Database backup is disabled");
            return;
        }

        if (databaseLocation === ":memory:") {
            logger.info(
                "Skipping database backup, as the database is in-memory",
            );
            return;
        }

        await removeOldBackups("automatic", maxBackupDays);

        logger.info("Backing up the current database");

        await createNewBackup("automatic");

        logger.info("Database backup finished.");
    },
};
