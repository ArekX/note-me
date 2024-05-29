/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import "$std/dotenv/load.ts";

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";
import config from "./fresh.config.ts";
import { initializeWorkers } from "./workers/mod.ts";
import { initializeBackend } from "$backend/initialize.ts";

initializeWorkers();
await initializeBackend();

await start(manifest, config);
