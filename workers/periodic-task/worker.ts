/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

import "$std/dotenv/load.ts";
import { workerLogger } from "$backend/logger.ts";
import { checkReminders } from "./tasks/check-reminders.ts";
import { periodicTaskService } from "./periodic-task-service.ts";
import { cleanupTempFolder } from "$workers/periodic-task/tasks/cleanup-temp-folder.ts";
import { connectWorkerToBus } from "$workers/services/worker-bus.ts";

self.onerror = (event) => {
    workerLogger.error(
        "Periodic task service error: {data}",
        {
            data: event?.error?.message || JSON.stringify(event),
        },
    );
};

if (import.meta.main) {
    periodicTaskService.registerPeriodicTask(checkReminders);
    periodicTaskService.registerPeriodicTask(cleanupTempFolder);

    connectWorkerToBus(self);

    periodicTaskService.start();
}
