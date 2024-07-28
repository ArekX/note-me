import { databaseLocation } from "$backend/database.ts";
import { formatDate, joinPath } from "$backend/deps.ts";
import { exists } from "$std/fs/exists.ts";
import { logger } from "$backend/logger.ts";

const backupLocation = new URL(
    `../${Deno.env.get("FILE_DATABASE_BACKUP_FOLDER") ?? "backups"}`,
    import.meta.url,
).pathname;

export type BackupType = "automatic" | "manual";

export interface BackupRecord {
    name: string;
    created_at: number;
    size: number;
}

const createBackupRecord = async (backupName: string) => {
    const stat = await Deno.stat(joinPath(backupLocation, backupName));

    return {
        name: backupName,
        created_at: Math.floor((stat.mtime?.getTime() ?? 0) / 1000),
        size: stat.size ?? 0,
    };
};

export const getBackups = async () => {
    if (!(await exists(backupLocation))) {
        return [];
    }

    const files: BackupRecord[] = [];
    for await (const file of Deno.readDir(backupLocation)) {
        if (!file.isFile) {
            continue;
        }

        files.push(await createBackupRecord(file.name));
    }
    return files;
};

export const getBackupFile = async (backup: string) => {
    const backupPath = joinPath(backupLocation, backup);

    if (!(await exists(backupPath))) {
        return null;
    }

    const stat = await Deno.stat(backupPath);

    return {
        file: await Deno.open(backupPath, { read: true }),
        size: stat.size,
    };
};

export const deleteBackup = async (backup: string) => {
    const backupPath = joinPath(backupLocation, backup);
    if (await exists(backupPath)) {
        await Deno.remove(backupPath);
    }
};

export const createNewBackup = async (
    type: BackupType,
): Promise<BackupRecord> => {
    const backupDate = formatDate(new Date(), "yyyy-MM-dd-HH-mm-ss");

    await Deno.mkdir(backupLocation, { recursive: true });

    const name = `${backupDate}-${type}.db`;
    const fullBackupPath = joinPath(backupLocation, name);

    await Deno.copyFile(
        databaseLocation,
        fullBackupPath,
    );

    return await createBackupRecord(name);
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

export const removeOldBackups = async (
    type: BackupType,
    maxBackupDays: number,
) => {
    if (!(await exists(backupLocation))) {
        return;
    }
    const files: string[] = [];
    for await (const file of Deno.readDir(backupLocation)) {
        if (!file.isFile || !file.name.endsWith(`-${type}.db`)) {
            continue;
        }

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
