import {
  DatabaseIntrospector,
  Dialect,
  DialectAdapter,
  Driver,
  Kysely,
  QueryCompiler,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
} from "./deps.ts";
import { SqliteDriver } from "./driver.ts";

export class SqliteDialect implements Dialect {
  constructor(protected databaseLocation: string) {
  }

  createDriver(): Driver {
    return new SqliteDriver(this.databaseLocation);
  }
  createQueryCompiler(): QueryCompiler {
    return new SqliteQueryCompiler();
  }
  createAdapter(): DialectAdapter {
    return new SqliteAdapter();
  }

  createIntrospector(db: Kysely<unknown>): DatabaseIntrospector {
    return new SqliteIntrospector(db);
  }
}
