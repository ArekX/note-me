import { Command } from "$cli/deps.ts";
import { migrator } from "$backend/migration-manager.ts";

export const migrateUpCommand = new Command()
    .description("Runs migrations")
    .arguments("[amount:number]")
    .action(async (_options: unknown, amount?: number) => {
        await migrator.migrateUp(amount);
    });
