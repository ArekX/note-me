import { databaseLocation } from "$backend/database.ts";
import { formatDate } from "$backend/deps.ts";
import { BackupInputRecord } from "$lib/backup-handler/mod.ts";

export const createBackupInputRecord = (
    type: "automatic" | "manual",
): BackupInputRecord => {
    const identifier = `${type}-${
        formatDate(new Date(), "yyyy-MM-dd-HH-mm-ss")
    }.db`;

    return {
        identifier,
        inputLocation: databaseLocation,
    };
};
