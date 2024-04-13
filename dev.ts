#!/usr/bin/env -S deno run -A --watch=static/,routes/

import dev from "$fresh/dev.ts";
import config from "./fresh.config.ts";

import "$std/dotenv/load.ts";
import { backgroundServices } from "./backend/workers/mod.ts";
import { webLogger } from "$backend/logger.ts";

backgroundServices.startAll();
webLogger.debug("All background services started");

await dev(import.meta.url, "./main.ts", config);
