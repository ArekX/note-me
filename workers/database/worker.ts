/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

import { logger, setLoggerName } from "$backend/logger.ts";
import {
    connectWorkerToBus,
    sendServiceReadyMessage,
} from "$workers/services/worker-bus.ts";
import { loadEnvironment } from "$backend/env.ts";
import { handleMesage } from "./database.ts";
import { RepositoryRequest } from "$workers/database/message.ts";
import { bootstrap } from "$workers/database/bootstrap.ts";

loadEnvironment();
setLoggerName("database");

self.onerror = (event) => {
    logger.error("WebSocket service error: {data}", {
        data: event?.error?.message || JSON.stringify(event),
    });
};

if (import.meta.main) {
    connectWorkerToBus(
        "database",
        self,
        (message) => handleMesage(message as RepositoryRequest),
    );

    await bootstrap();

    logger.info("Database worker started");
    sendServiceReadyMessage();
}
