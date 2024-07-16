import { Kysely, sql, SqliteDialect } from "$lib/kysely-sqlite-dialect/mod.ts";
import { Semaphore } from "./deps.ts";

import type { Tables } from "$types";

const createDatabaseClient = (path: string): Kysely<Tables> =>
    new Kysely<Tables>({
        dialect: new SqliteDialect(path),
    });

export let db: Kysely<Tables> = createDatabaseClient(
    Deno.env.get("SQLITE_DATABASE_LOCATION") ?? ":memory:",
);

const transactionSemaphore = new Semaphore(1);

export interface Transaction {
    commit: () => Promise<void>;
    rollback: () => Promise<void>;
    run: <T>(callback: () => Promise<T>) => Promise<T>;
}

export const createTransaction = async (): Promise<Transaction> => {
    const release: () => void = await transactionSemaphore.acquire();

    await sql`BEGIN TRANSACTION`.execute(db);
    let finished = false;

    const commit = async () => {
        if (finished) {
            throw new Error("Transaction already finished");
        }

        release();
        await sql`COMMIT`.execute(db);
        finished = true;
    };

    const rollback = async () => {
        if (finished) {
            throw new Error("Transaction already finished");
        }

        release();
        await sql`ROLLBACK`.execute(db);
        finished = true;
    };

    return {
        commit,
        rollback,
        run: async <T>(callback: () => Promise<T>): Promise<T> => {
            try {
                const result = await callback();
                await commit();
                return result;
            } catch (error) {
                await rollback();
                throw error;
            }
        },
    };
};

export const setupTestDatabase = () => {
    db = createDatabaseClient(":memory:");
};
