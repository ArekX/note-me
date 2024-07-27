import { logger } from "$backend/logger.ts";
import { PeriodicTask } from "../periodic-task-service.ts";
import { startOfNextDay } from "$workers/periodic-task/next-at.ts";
import { databaseLocation } from "$backend/database.ts";
import { join } from "$std/path/mod.ts";
import { formatDate } from "$backend/deps.ts";
import {
    getMultiSettingsValue,
} from "$backend/repository/settings-repository.ts";

const backupLocation = new URL(
    `../../../${Deno.env.get("FILE_DATABASE_BACKUP_FOLDER") ?? "backups"}`,
    import.meta.url,
).pathname;

const removeOldBackups = async (maxBackupDays: number) => {
    const files: string[] = [];
    for await (const file of Deno.readDir(backupLocation)) {
        files.push(file.name);
        files.sort();
        if (files.length >= maxBackupDays) {
            const oldestFile = files.shift()!;
            logger.info("Removing old backup file {file}", {
                file: oldestFile,
            });
            await Deno.remove(join(backupLocation, oldestFile));
        }
    }
};

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

        await Deno.mkdir(backupLocation, { recursive: true });

        await removeOldBackups(maxBackupDays);

        logger.info("Backing up the current database");

        const backupDate = formatDate(new Date(), "yyyy-MM-dd-HH-mm-ss");

        await Deno.copyFile(
            databaseLocation,
            join(backupLocation, `${backupDate}-backup.db`),
        );

        logger.info("Database backup finished.");
    },
};
