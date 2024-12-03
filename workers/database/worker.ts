/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

import { logger, setLoggerName } from "$backend/logger.ts";
import {
    connectWorkerMessageListener,
    connectWorkerToBus,
    sendServiceReadyMessage,
} from "$workers/services/worker-bus.ts";
import { loadEnvironment } from "$backend/env.ts";
import { handleMesage } from "./database.ts";
import { DbRequest } from "$workers/database/message.ts";
import { bootstrap } from "$workers/database/bootstrap.ts";
import { DatabaseMessageKey } from "$workers/database/database-message.ts";

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
    );

    connectWorkerMessageListener<DbRequest, DatabaseMessageKey>(
        "databaseRequest",
        (message) => handleMesage(message),
    );

    await bootstrap();

    logger.info("Database worker started");
    sendServiceReadyMessage();
}
