/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

import { logger, setLoggerName } from "$backend/logger.ts";
import { loadEnvironment } from "$backend/env.ts";

loadEnvironment();

setLoggerName("database");

self.onerror = (event) => {
    logger.error(
        "Database service error: {data}",
        {
            data: event?.error?.message || JSON.stringify(event),
        },
    );
};

if (import.meta.main) {
    console.log("Implement");
}
