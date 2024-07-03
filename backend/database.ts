import { Kysely, sql, SqliteDialect } from "$lib/kysely-sqlite-dialect/mod.ts";

import type { Tables } from "$types";

const createDatabaseClient = (path: string): Kysely<Tables> =>
    new Kysely<Tables>({
        dialect: new SqliteDialect(path),
    });

export let db: Kysely<Tables> = createDatabaseClient(
    Deno.env.get("SQLITE_DATABASE_LOCATION") ?? ":memory:",
);

export const beginTransaction = () => sql`BEGIN TRANSACTION`.execute(db);

export const commitTransaction = () => sql`COMMIT`.execute(db);

export const rollbackTransaction = () => sql`ROLLBACK`.execute(db);

export const runInTransaction = async <T>(
    callback: () => Promise<T>,
): Promise<T> => {
    await beginTransaction();
    try {
        const result = await callback();
        await commitTransaction();
        return result;
    } catch (error) {
        await rollbackTransaction();
        throw error;
    }
};

export const setupTestDatabase = () => {
    db = createDatabaseClient(":memory:");
};
