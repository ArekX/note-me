import { Kysely, SqliteDialect } from "./lib/kysely-sqlite-dialect/mod.ts";

import type { Tables } from "$types";

export const db = new Kysely<Tables>({
  dialect: new SqliteDialect(
    Deno.env.get("SQLITE_DATABASE_LOCATION") ?? ":memory:",
  ),
});
