import { Kysely, SqliteDialect } from "$lib/kysely-sqlite-dialect/mod.ts";

import type { Tables } from "$types/tables.ts";
import { joinPath } from "$vendor";

export const db = new Kysely<Tables>({
  dialect: new SqliteDialect(":memory:"), //joinPath(Deno.cwd(), "database.sqlite")),
});
