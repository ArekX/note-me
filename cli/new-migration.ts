import { Command } from "$cli/deps.ts";
import { migrator } from "$backend/migration-manager.ts";

export const newMigrationCommand = new Command()
    .description("Add new migration")
    .arguments("<name:string>")
    .action(async (_options: unknown, name: string) => {
        await migrator.migrateNew(name);
    });
