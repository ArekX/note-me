/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

import "$std/dotenv/load.ts";
import { workerLogger } from "$backend/logger.ts";
import { checkReminders } from "./tasks/check-reminders.ts";
import { periodicTaskService } from "./periodic-task-service.ts";
import { cleanupTempFolder } from "$workers/periodic-task/tasks/cleanup-temp-folder.ts";

periodicTaskService.registerPeriodicTask(checkReminders);
periodicTaskService.registerPeriodicTask(cleanupTempFolder);

if (import.meta.main) {
    periodicTaskService.start();
}

self.onerror = (event) => {
    workerLogger.error(
        "Periodic task service error: {data}",
        {
            data: event?.error?.message || JSON.stringify(event),
        },
    );
};
