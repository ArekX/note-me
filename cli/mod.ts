import "$std/dotenv/load.ts";

import { Command } from "$cli/deps.ts";

import { newMigrationCommand } from "./new-migration.ts";
import { migrateDownCommand } from "./migrate-down.ts";
import { migrateUpCommand } from "./migrate-up.ts";
import { addUser } from "./add-user.ts";

await new Command()
  .name("NoteMe CLI")
  .version("1.0.0")
  .description("Command Line Tools for NoteMe")
  .command("new-migration", newMigrationCommand)
  .command("migrate-down", migrateDownCommand)
  .command("migrate-up", migrateUpCommand)
  .command("add-user", addUser)
  .parse(Deno.args.length > 0 ? Deno.args : ["--help"]);
