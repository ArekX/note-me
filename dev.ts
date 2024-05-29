#!/usr/bin/env -S deno run -A --watch=static/,routes/

import dev from "$fresh/dev.ts";
import config from "./fresh.config.ts";

import "$std/dotenv/load.ts";
import { startBackgroundServices } from "$workers/mod.ts";
import { initTempLocation } from "$backend/file-upload.ts";

startBackgroundServices();

await initTempLocation();

await dev(import.meta.url, "./main.ts", config);
