import { cleanupOldTempFiles } from "../../../backend/temp.ts";
import { logger } from "$backend/logger.ts";
import { startOfNextDay } from "$workers/periodic-task/next-at.ts";
import { PeriodicTask } from "../periodic-task-service.ts";

// TODO: Test this
export const cleanupTempFolder: PeriodicTask = {
    name: "cleanup-temp-folder",
    getNextAt: startOfNextDay,
    async trigger(): Promise<void> {
        logger.info("Cleaning up old temporary files");
        await cleanupOldTempFiles();
        logger.info("Finished cleaning up old temporary files");
    },
};
