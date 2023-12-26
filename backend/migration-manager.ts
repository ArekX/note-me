import { db } from "$backend/database.ts";
import { KyselyMigrationManager } from "./lib/migrator/migrator.ts";
import { joinPath } from "./deps.ts";

export const migrator = new KyselyMigrationManager(
  db,
  joinPath(Deno.cwd(), "migrations"),
);
