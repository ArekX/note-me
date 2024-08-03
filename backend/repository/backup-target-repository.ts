import { db } from "$backend/database.ts";
import { getCurrentUnixTimestamp } from "$lib/time/unix.ts";
import { sql } from "$lib/kysely-sqlite-dialect/deps.ts";
import { RecordId } from "../../types/repository.ts";

export interface BaseBackupTarget<Type, Settings extends object> {
    name: string;
    type: Type;
    settings: Settings;
}

export type BackupTargetType = BackupTarget["type"];

export type BackupTarget =
    | BaseBackupTarget<"local", {
        location: string;
    }>
    | BaseBackupTarget<"s3", {
        bucket: string;
        region: string;
        access_key?: string;
        secret_key?: string;
    }>;

export const getTargetCount = async (): Promise<number> => {
    const result = await db.selectFrom("backup_target")
        .select([
            sql<number>`COUNT(*)`.as("count"),
        ])
        .executeTakeFirst();

    return result?.count ?? 0;
};

export const createBackupTarget = async (
    target: BackupTarget,
): Promise<number> => {
    const result = await db.insertInto("backup_target")
        .values({
            name: target.name,
            type: target.type as string,
            settings: JSON.stringify(target.settings),
            created_at: getCurrentUnixTimestamp(),
            updated_at: getCurrentUnixTimestamp(),
        })
        .returning(["id"])
        .executeTakeFirst();

    return result!.id;
};

export type BackupTargetRecord = BackupTarget & RecordId;

export const getBackupTargets = async (): Promise<BackupTargetRecord[]> => {
    const results = await db.selectFrom("backup_target")
        .select(["id", "name", "type", "settings"])
        .execute();

    return results.map((result) => ({
        id: result.id,
        name: result.name,
        type: result.type as BackupTargetType,
        settings: JSON.parse(result.settings),
    }));
};

export const deleteBackupTarget = async (id: number) => {
    await db.deleteFrom("backup_target")
        .where("id", "=", id)
        .execute();
};
