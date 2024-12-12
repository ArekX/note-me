/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

import { logger, setLoggerName } from "$backend/logger.ts";

import { loadEnvironment } from "$backend/env.ts";
import { connectWorkerChannel } from "./message-handler.ts";
import { bootstrap } from "$workers/database/bootstrap.ts";
import { createWorkerChannel } from "../services/channel.ts";
import { workerNotifyReady } from "$workers/services/worker-helper.ts";

loadEnvironment();
setLoggerName("database");

self.onerror = (event) => {
    logger.error("WebSocket service error: {data}", {
        data: event?.error?.message || JSON.stringify(event),
    });
};

if (import.meta.main) {
    const workerChannel = createWorkerChannel("database", self);
    connectWorkerChannel(workerChannel);

    await bootstrap();

    logger.info("Database worker started");
    await workerNotifyReady(workerChannel);
}
