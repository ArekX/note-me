import {
  CompiledQuery,
  DatabaseConnection,
  DB,
  QueryParameterSet,
  QueryResult,
} from "./deps.ts";

export class SqliteDatabaseConnection implements DatabaseConnection {
  constructor(private db: DB) {}
  executeQuery<R>(
    compiledQuery: CompiledQuery<unknown>,
  ): Promise<QueryResult<R>> {
    return new Promise((resolve, reject) => {
      try {
        const rows = this.db.queryEntries(
          compiledQuery.sql,
          compiledQuery.parameters as QueryParameterSet,
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
    const query = this.db.prepareQuery(compiledQuery.sql);

    const queryIterator = query.iter(
      compiledQuery.parameters as QueryParameterSet,
    );

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
            let row;
            itemsInChunk = [];
            do {
              row = queryIterator.next();
              itemsInChunk.push(row.value);
            } while (itemsInChunk.length < itemsToRetrieve && !row.done);

            if (row.done) {
              query.finalize();
              isFinalized = true;
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
