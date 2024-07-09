import { cleanupOldTempFiles } from "$backend/file-upload.ts";
import { workerLogger } from "$backend/logger.ts";
import { startOfNextDay } from "$workers/periodic-task/next-at.ts";
import { PeriodicTask } from "../periodic-task-service.ts";

// TODO: Test this
export const cleanupTempFolder: PeriodicTask = {
    name: "cleanup-temp",
    getNextAt: startOfNextDay,
    async trigger(): Promise<void> {
        workerLogger.info("Cleaning up old temporary files");
        await cleanupOldTempFiles();
        workerLogger.info("Finished cleaning up old temporary files");
    },
};
