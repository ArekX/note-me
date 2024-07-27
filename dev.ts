#!/usr/bin/env -S deno run -A --watch=static/,routes/

import dev from "$fresh/dev.ts";
import config from "./fresh.config.ts";

import { initializeWorkers } from "$workers/mod.ts";
import { initializeBackend } from "$backend/initialize.ts";
import { loadEnvironment } from "$backend/env.ts";

loadEnvironment();

await initializeBackend();
initializeWorkers();

await dev(import.meta.url, "./main.ts", config);
