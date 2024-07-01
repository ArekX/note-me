import { cleanupOldTempFiles } from "$backend/file-upload.ts";
import { workerLogger } from "$backend/logger.ts";
import { EVERY_DAY, PeriodicTask } from "../periodic-task-service.ts";

// TODO: Test this
export const cleanupTempFolder: PeriodicTask = {
    name: "cleanup-temp",
    interval: EVERY_DAY,
    async trigger(): Promise<void> {
        workerLogger.info("Cleaning up old temporary files");
        await cleanupOldTempFiles();
        workerLogger.info("Finished cleaning up old temporary files");
    },
};
