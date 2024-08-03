import { logger } from "$backend/logger.ts";
import { PeriodicTask } from "../periodic-task-service.ts";
import { startOfNextDay } from "$workers/periodic-task/next-at.ts";
import { databaseLocation } from "$backend/database.ts";
import { getBackupTargets } from "$backend/repository/backup-target-repository.ts";

export const backupDatabase: PeriodicTask = {
    name: "backup-database",
    getNextAt: startOfNextDay,
    async trigger(): Promise<void> {
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
            
        }

        // await removeOldBackups("automatic", maxBackupDays);

        logger.info("Backing up the current database");

        // await createNewBackup("automatic");

        logger.info("Database backup finished.");
    },
};
