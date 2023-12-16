import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts";
import { migrator } from "$backend/migration-manager.ts";

export const migrateDownCommand = new Command()
  .description("Rollbacks a migration")
  .arguments("[amount:number]")
  .action(async (_options: unknown, amount?: number) => {
    await migrator.migrateDown(amount);
  });
