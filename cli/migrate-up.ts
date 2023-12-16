import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts";
import { migrator } from "$backend/migration-manager.ts";

export const migrateUpCommand = new Command()
  .description("Runs migrations")
  .arguments("[amount:number]")
  .action(async (_options: unknown, amount?: number) => {
    await migrator.migrateUp(amount);
  });
