import { Kysely, SqliteDialect } from "./lib/kysely-sqlite-dialect/mod.ts";

import type { Tables } from "$types";

const createDatabaseClient = (path: string) =>
  new Kysely<Tables>({
    dialect: new SqliteDialect(path),
  });

export let db = createDatabaseClient(
  Deno.env.get("SQLITE_DATABASE_LOCATION") ?? ":memory:",
);

export const setupTestDatabase = () => {
  db = createDatabaseClient(":memory:");
};
