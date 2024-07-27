/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";
import config from "./fresh.config.ts";
import { initializeWorkers } from "./workers/mod.ts";
import { initializeBackend } from "$backend/initialize.ts";
import { loadEnvironment } from "$backend/env.ts";

loadEnvironment();
await initializeBackend();
initializeWorkers();

await start(manifest, config);
