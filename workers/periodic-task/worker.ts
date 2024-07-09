/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

import "$std/dotenv/load.ts";
import { workerLogger } from "$backend/logger.ts";
import { checkReminders } from "./tasks/check-reminders.ts";
import { periodicTaskService } from "./periodic-task-service.ts";
import { cleanupTempFolder } from "$workers/periodic-task/tasks/cleanup-temp-folder.ts";
import { connectWorkerToBus } from "$workers/services/worker-bus.ts";
import { removeExpiredShareLinks } from "$workers/periodic-task/tasks/remove-expired-share-links.ts";

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
    periodicTaskService.registerPeriodicTask(removeExpiredShareLinks);

    connectWorkerToBus(self);

    periodicTaskService.start();
}
