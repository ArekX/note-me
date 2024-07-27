import { databaseLocation } from "$backend/database.ts";
import { formatDate, joinPath } from "$backend/deps.ts";
import { exists } from "$std/fs/exists.ts";
import { logger } from "$backend/logger.ts";

const backupLocation = new URL(
    `../${Deno.env.get("FILE_DATABASE_BACKUP_FOLDER") ?? "backups"}`,
    import.meta.url,
).pathname;

export const getBackups = async () => {
    if (!(await exists(backupLocation))) {
        return [];
    }

    const files: string[] = [];
    for await (const file of Deno.readDir(backupLocation)) {
        files.push(file.name);
    }
    return files;
};

export const storeBackup = async () => {
    const backupDate = formatDate(new Date(), "yyyy-MM-dd-HH-mm-ss");

    await Deno.mkdir(backupLocation, { recursive: true });

    await Deno.copyFile(
        databaseLocation,
        joinPath(backupLocation, `${backupDate}-backup.db`),
    );
};

export const restoreBackup = async (backup: string): Promise<boolean> => {
    if (!(await exists(databaseLocation))) {
        return false;
    }

    try {
        const backupPath = joinPath(backupLocation, backup);
        await Deno.copyFile(backupPath, databaseLocation);
        return true;
    } catch (e) {
        logger.error("Failed to restore backup: {error}", {
            error: e.message ?? "Unknown error.",
        });
        return false;
    }
};

export const removeOldBackups = async (maxBackupDays: number) => {
    if (!(await exists(backupLocation))) {
        return;
    }
    const files: string[] = [];
    for await (const file of Deno.readDir(backupLocation)) {
        files.push(file.name);
        files.sort();
        if (files.length >= maxBackupDays) {
            const oldestFile = files.shift()!;
            logger.info("Removing old backup file {file}", {
                file: oldestFile,
            });
            await Deno.remove(joinPath(backupLocation, oldestFile));
        }
    }
};
