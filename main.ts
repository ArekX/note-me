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
import { backgroundServices } from "./workers/mod.ts";

backgroundServices.startAll();
await migrator.migrateUp();
await start(manifest, config);
