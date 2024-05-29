#!/usr/bin/env -S deno run -A --watch=static/,routes/

import dev from "$fresh/dev.ts";
import config from "./fresh.config.ts";

import "$std/dotenv/load.ts";
import { initializeWorkers } from "$workers/mod.ts";
import { initializeBackend } from "$backend/initialize.ts";

initializeWorkers();
await initializeBackend("development");

await dev(import.meta.url, "./main.ts", config);
