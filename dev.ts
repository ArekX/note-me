#!/usr/bin/env -S deno run -A --watch=static/,routes/

import dev from "$fresh/dev.ts";
import config from "./fresh.config.ts";

import "$std/dotenv/load.ts";
import { backgroundServices } from "./workers/mod.ts";
import { webLogger } from "$backend/logger.ts";
import { setupCleanupActions } from "$backend/cleanup.ts";

backgroundServices.startAll();
webLogger.debug("All background services started");

setupCleanupActions();

await dev(import.meta.url, "./main.ts", config);
