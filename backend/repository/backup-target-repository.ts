import { db } from "$backend/database.ts";
import { getCurrentUnixTimestamp } from "$lib/time/unix.ts";
import { sql } from "$lib/kysely-sqlite-dialect/deps.ts";
import { SettingsMap, TargetType } from "$lib/backup-handler/handlers.ts";
import { BackupTargetTable, RecordId } from "$types";
import { BackupTargetRequest } from "$schemas/settings.ts";

export interface BackupTarget<T extends TargetType = TargetType> extends
    Pick<
        BackupTargetTable,
        "name" | "created_at" | "updated_at" | "last_backup_at"
    > {
    type: T;
    settings: SettingsMap[T];
}

export const getTargetCount = async (): Promise<number> => {
    const result = await db.selectFrom("backup_target")
        .select([
            sql<number>`COUNT(*)`.as("count"),
        ])
        .executeTakeFirst();

    return result?.count ?? 0;
};

export const createBackupTarget = async (
    target: BackupTargetRequest,
): Promise<BackupTargetRecord> => {
    const result = await db.insertInto("backup_target")
        .values({
            name: target.name,
            type: target.type as string,
            settings: JSON.stringify(target.settings),
            created_at: getCurrentUnixTimestamp(),
            updated_at: getCurrentUnixTimestamp(),
        })
        .returning([
            "id",
            "name",
            "type",
            "settings",
            "created_at",
            "updated_at",
            "last_backup_at",
        ])
        .executeTakeFirst();

    return mapToBackupTargetRecord(result!);
};

export const updateBackupTarget = async (
    id: number,
    data: BackupTargetRequest,
): Promise<void> => {
    await db.updateTable("backup_target")
        .set({
            name: data.name,
            type: data.type as string,
            settings: JSON.stringify(data.settings),
            updated_at: getCurrentUnixTimestamp(),
        })
        .where("id", "=", id)
        .executeTakeFirst();
};

export type BackupTargetRecord = BackupTarget & RecordId;

const mapToBackupTargetRecord = (
    result:
        & RecordId
        & Pick<
            BackupTargetTable,
            | "type"
            | "name"
            | "settings"
            | "created_at"
            | "updated_at"
            | "last_backup_at"
        >,
): BackupTargetRecord => ({
    id: result.id,
    name: result.name,
    type: result.type as TargetType,
    settings: JSON.parse(result.settings),
    created_at: result.created_at,
    updated_at: result.updated_at,
    last_backup_at: result.last_backup_at,
});

export const getBackupTargets = async (): Promise<BackupTargetRecord[]> => {
    const results = await db.selectFrom("backup_target")
        .select([
            "id",
            "name",
            "type",
            "settings",
            "created_at",
            "updated_at",
            "last_backup_at",
        ])
        .execute();

    return results.map(mapToBackupTargetRecord);
};

export const getBackupTarget = async (
    id: number,
): Promise<BackupTargetRecord | null> => {
    const result = await db.selectFrom("backup_target")
        .select([
            "id",
            "name",
            "type",
            "settings",
            "created_at",
            "updated_at",
            "last_backup_at",
        ])
        .where("id", "=", id)
        .executeTakeFirst();

    if (!result) {
        return null;
    }

    return mapToBackupTargetRecord(result);
};

export const deleteBackupTarget = async (id: number) => {
    await db.deleteFrom("backup_target")
        .where("id", "=", id)
        .execute();
};

export const isBackupInProgress = async (id: number) => {
    const result = await db.selectFrom("backup_target")
        .select(["is_backup_in_progess"])
        .where("id", "=", id)
        .executeTakeFirst();

    return result?.is_backup_in_progess ?? false;
};

export const updateLastBackupAt = async (id: number) => {
    await db.updateTable("backup_target")
        .set({ last_backup_at: getCurrentUnixTimestamp() })
        .where("id", "=", id)
        .execute();
};

export const updateBackupInProgress = async (
    id: number,
    inProgress: boolean,
) => {
    await db.updateTable("backup_target")
        .set({ is_backup_in_progess: inProgress })
        .where("id", "=", id)
        .execute();
};

export const clearAllBackupInProgress = async () => {
    await db.updateTable("backup_target")
        .set({ is_backup_in_progess: false })
        .execute();
};
