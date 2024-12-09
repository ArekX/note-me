/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

import { logger, setLoggerName } from "$backend/logger.ts";
import { loadEnvironment } from "$backend/env.ts";
import { waitUntilChannelReady } from "$workers/processor/channel.ts";

loadEnvironment();

setLoggerName("processor");

self.onerror = (event) => {
    logger.error(
        "Processor service error: {data}",
        {
            data: event?.error?.message || JSON.stringify(event),
        },
    );
};

if (import.meta.main) {
    logger.info("Processor service started.");
    await waitUntilChannelReady();
}
