import { Command } from "$cli/deps.ts";
import { logger } from "$backend/logger.ts";
import { createNewBackup } from "$backend/backups.ts";

export const createBackup = new Command()
    .description("Create new database backup")
    .action(
        async (
            _options: unknown,
        ) => {
            logger.info("Creating new backup...");
            const backup = await createNewBackup("manual");
            logger.info(`Backup created - ${backup.name}`);
        },
    );
