import { db } from "$backend/database.ts";
import { KyselyMigrationManager } from "$lib/migrator/migrator.ts";
import { joinPath } from "$vendor";

export const migrator = new KyselyMigrationManager(
  db,
  joinPath(Deno.cwd(), "migrations"),
);
