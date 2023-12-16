import { db } from "$backend/database.ts";
import { KyselyMigrationManager } from "$lib/migrator/migrator.ts";
import { join } from "$std/path/join.ts";

export const migrator = new KyselyMigrationManager(
  db,
  join(Deno.cwd(), "migrations"),
);
