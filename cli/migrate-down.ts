import { Command } from "$cli/deps.ts";
import { migrator } from "$backend/migration-manager.ts";

export const migrateDownCommand = new Command()
    .description("Rollbacks a migration")
    .arguments("[amount:number]")
    .action(async (_options: unknown, amount?: number) => {
        await migrator.migrateDown(amount);
    });
