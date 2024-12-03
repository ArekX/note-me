/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

import { logger, setLoggerName } from "$backend/logger.ts";
import {
    connectWorkerToBus,
    sendServiceReadyMessage,
} from "$workers/services/worker-bus.ts";
import { loadEnvironment } from "$backend/env.ts";
import {
    ProcessorRequestMessage,
} from "$workers/processor/processor-message.ts";
import { processorService } from "$workers/processor/processor-service.ts";

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
    connectWorkerToBus(
        "processor",
        self,
        async (message: ProcessorRequestMessage) => {
            switch (message.type) {
                case "process":
                    await processorService.processRequest(message);
                    break;
                case "abort":
                    processorService.abortRequest(message);
                    break;
                default:
                    logger.error(
                        "Received an invalid message type: {message}",
                        {
                            message: JSON.stringify(message),
                        },
                    );
                    break;
            }
        },
    );

    logger.info("Processor service started.");
    sendServiceReadyMessage();
}
