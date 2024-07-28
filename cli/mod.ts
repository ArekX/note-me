import { Command } from "$cli/deps.ts";

import { newMigrationCommand } from "./new-migration.ts";
import { migrateDownCommand } from "./migrate-down.ts";
import { migrateUpCommand } from "./migrate-up.ts";
import { addUser } from "./add-user.ts";
import { setLoggerName } from "$backend/logger.ts";
import { loadEnvironment } from "$backend/env.ts";
import { restoreBackup } from "$cli/restore-backup.ts";
import { createBackup } from "$cli/create-backup.ts";

loadEnvironment();
setLoggerName("cli");

await new Command()
    .name("NoteMe CLI")
    .version("1.0.0")
    .description("Command Line Tools for NoteMe")
    .command("new-migration", newMigrationCommand)
    .command("migrate-down", migrateDownCommand)
    .command("migrate-up", migrateUpCommand)
    .command("add-user", addUser)
    .command("restore-backup", restoreBackup)
    .command("create-backup", createBackup)
    .parse(Deno.args.length > 0 ? Deno.args : ["--help"]);
