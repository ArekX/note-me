import { SqliteDatabaseConnection } from "./connection.ts";
import {
    CompiledQuery,
    DatabaseConnection,
    DB,
    Driver,
    Semaphore,
    TransactionSettings,
} from "./deps.ts";

export class SqliteDriver implements Driver {
    #db: DB;
    #semaphore: Semaphore;
    #semaphoreRelease: (() => void) | null = null;

    constructor(databaseLocation: string) {
        this.#db = new DB(databaseLocation);
        this.#semaphore = new Semaphore(1);
    }

    init(): Promise<void> {
        return Promise.resolve();
    }

    async acquireConnection(): Promise<DatabaseConnection> {
        this.#semaphoreRelease = await this.#semaphore.acquire();
        return Promise.resolve(new SqliteDatabaseConnection(this.#db));
    }

    async beginTransaction(
        connection: DatabaseConnection,
        _settings: TransactionSettings,
    ): Promise<void> {
        await connection.executeQuery(CompiledQuery.raw("BEGIN"));
    }

    async commitTransaction(connection: DatabaseConnection): Promise<void> {
        await connection.executeQuery(CompiledQuery.raw("COMMIT"));
    }

    async rollbackTransaction(connection: DatabaseConnection): Promise<void> {
        await connection.executeQuery(CompiledQuery.raw("ROLLBACK"));
    }

    releaseConnection(_connection: DatabaseConnection): Promise<void> {
        this.#semaphoreRelease?.();
        return Promise.resolve();
    }

    destroy(): Promise<void> {
        this.#db.close();
        return Promise.resolve();
    }
}
