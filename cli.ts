import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts";
import { newMigrationCommand } from "./cli/new-migration.ts";
import { migrateDownCommand } from "./cli/migrate-down.ts";
import { migrateUpCommand } from "./cli/migrate-up.ts";

await new Command()
  .name("NoteMe CLI")
  .version("1.0.0")
  .description("Command Line Tools for NoteMe")
  .command("new-migration", newMigrationCommand)
  .command("migrate-down", migrateDownCommand)
  .command("migrate-up", migrateUpCommand)
  .parse(Deno.args.length > 0 ? Deno.args : ["--help"]);
