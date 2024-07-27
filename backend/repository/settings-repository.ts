import { db } from "$backend/database.ts";
import { sql } from "$lib/kysely-sqlite-dialect/deps.ts";
import { SettingsTable } from "../../types/tables.ts";

export type Settings = Omit<SettingsTable, "id">;

export const getSettings = async (): Promise<Settings> => {
    const result = await db.selectFrom("settings")
        .selectAll()
        .limit(1)
        .executeTakeFirst();

    if (!result) {
        throw new Error("No settings found");
    }

    return result;
};

export const getSettingsValue = async <K extends keyof Settings>(
    key: K,
): Promise<Settings[K]> => {
    key = key.replace(/[^a-zA-Z0-9_]/g, "") as K;

    const result = await db.selectFrom("settings")
        .select([
            sql.raw<Settings[K]>(key).as("value"),
        ])
        .limit(1)
        .executeTakeFirst();

    if (!result) {
        throw new Error(`No settings found for key ${key}`);
    }

    return result.value;
};

export const getMultiSettingsValue = async <K extends keyof Settings>(
    keys: K[],
): Promise<Settings[K][]> => {
    keys = keys.map((k) => k.replace(/[^a-zA-Z0-9_]/g, "") as K);

    const result = await db.selectFrom("settings")
        .select([
            "id",
            ...keys.map((k) => db.dynamic.ref<K>(k)),
        ])
        .executeTakeFirst();

    if (!result) {
        throw new Error(`No settings found for key ${keys}`);
    }

    return keys.map((k) => (result as Settings)[k]);
};

export const updateSettings = async (
    data: Partial<Settings>,
): Promise<void> => {
    await db.updateTable("settings")
        .set(data)
        .execute();
};
