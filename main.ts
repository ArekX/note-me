/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import "$std/dotenv/load.ts";

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";
import config from "./fresh.config.ts";
import { migrator } from "$backend/migration-manager.ts";
import { backgroundServices } from "./backend/workers/mod.ts";
import { initializeFirstRun } from "$backend/first-run.ts";
import { webLogger } from "$backend/logger.ts";

backgroundServices.startAll();

const isFirstRun = await migrator.isFirstRun();
await migrator.migrateUp();

if (isFirstRun) {
    webLogger.info("Setting up initial data on first run.");
    await initializeFirstRun();
}

await start(manifest, config);
