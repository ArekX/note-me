import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts";
import { migrator } from "$backend/migration-manager.ts";

export const newMigrationCommand = new Command()
  .description("Add new migration")
  .arguments("<name:string>")
  .action(async (_options: unknown, name: string) => {
    await migrator.migrateNew(name);
  });
