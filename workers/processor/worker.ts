/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

import { logger, setLoggerName } from "$backend/logger.ts";
import {
    connectWorkerMessageListener,
    connectWorkerToBus,
    sendServiceReadyMessage,
} from "$workers/services/worker-bus.ts";
import { loadEnvironment } from "$backend/env.ts";
import {
    AbortJobRequest,
    ProcessJobRequest,
    ProcessorMessageKey,
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
    );

    connectWorkerMessageListener<ProcessJobRequest, ProcessorMessageKey>(
        "process",
        (message) => processorService.processRequest(message),
    );

    connectWorkerMessageListener<AbortJobRequest, ProcessorMessageKey>(
        "abort",
        (message) => processorService.abortRequest(message),
    );

    logger.info("Processor service started.");
    sendServiceReadyMessage();
}
