import { RestBindParameters } from "jsr:@db/sqlite@0.11";
import {
    CompiledQuery,
    Database,
    DatabaseConnection,
    QueryResult,
} from "./deps.ts";

export class SqliteDatabaseConnection implements DatabaseConnection {
    constructor(private db: Database) {}
    executeQuery<R>(
        compiledQuery: CompiledQuery<unknown>,
    ): Promise<QueryResult<R>> {
        return new Promise((resolve, reject) => {
            try {
                const query = this.db.prepare(compiledQuery.sql);

                const rows = query.all(
                    ...compiledQuery.parameters as RestBindParameters,
                );

                resolve({
                    rows: rows as R[],
                    numAffectedRows: BigInt(this.db.changes),
                    insertId: BigInt(this.db.lastInsertRowId),
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    streamQuery<R>(
        compiledQuery: CompiledQuery<string>,
        chunkSize?: number | undefined,
    ): AsyncIterableIterator<QueryResult<R>> {
        const query = this.db.prepare(compiledQuery.sql);

        query.bind(...compiledQuery.parameters as RestBindParameters);

        let itemsInChunk: R[] = [];

        const itemsToRetrieve = chunkSize || 1;

        const dbRef = this.db;

        let isFinalized = false;

        return {
            next(
                ..._args: [] | [undefined]
            ): Promise<IteratorResult<QueryResult<R>>> {
                return new Promise((resolve, reject) => {
                    try {
                        itemsInChunk = [];

                        for (const row of query) {
                            itemsInChunk.push(row);

                            if (itemsInChunk.length >= itemsToRetrieve) {
                                isFinalized = true;
                                break;
                            }
                        }

                        resolve({
                            done: isFinalized,
                            value: {
                                rows: itemsInChunk,
                                numAffectedRows: BigInt(dbRef.changes),
                                insertId: BigInt(dbRef.lastInsertRowId),
                            },
                        });
                    } catch (error) {
                        reject(error);
                    }
                });
            },
            [Symbol.asyncIterator]() {
                return this;
            },
        };
    }
}
