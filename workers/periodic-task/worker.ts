/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

import { logger, setLoggerName } from "$backend/logger.ts";
import { checkReminders } from "./tasks/check-reminders.ts";
import { periodicTaskService } from "./periodic-task-service.ts";
import { cleanupTempFolder } from "./tasks/cleanup-temp-folder.ts";
import { connectWorkerToBus } from "$workers/services/worker-bus.ts";
import { removeExpiredShareLinks } from "./tasks/remove-expired-share-links.ts";
import { removeExpiredDeletedNotes } from "./tasks/remove-expired-deleted-notes.ts";
import { backupDatabase } from "./tasks/backup-database.ts";
import { loadEnvironment } from "$backend/env.ts";
import { connectDbMessageListener } from "$workers/database/database-message.ts";

loadEnvironment();

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
    periodicTaskService.registerPeriodicTask(removeExpiredDeletedNotes);
    periodicTaskService.registerPeriodicTask(backupDatabase);

    connectWorkerToBus("periodic-task", self);
    connectDbMessageListener();

    periodicTaskService.start();
}
