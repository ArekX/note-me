/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

import "$std/dotenv/load.ts";
import { logger, setLoggerName } from "$backend/logger.ts";
import { checkReminders } from "./tasks/check-reminders.ts";
import { periodicTaskService } from "./periodic-task-service.ts";
import { cleanupTempFolder } from "$workers/periodic-task/tasks/cleanup-temp-folder.ts";
import { connectWorkerToBus } from "$workers/services/worker-bus.ts";
import { removeExpiredShareLinks } from "$workers/periodic-task/tasks/remove-expired-share-links.ts";
import { removeExpiredNotes } from "$workers/periodic-task/tasks/remove-expired-deleted-notes.ts";

setLoggerName("periodic-task");

self.onerror = (event) => {
    logger.error(
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
    periodicTaskService.registerPeriodicTask(removeExpiredNotes);

    connectWorkerToBus(self);

    periodicTaskService.start();
}
