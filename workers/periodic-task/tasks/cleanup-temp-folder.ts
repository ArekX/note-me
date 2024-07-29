import { cleanupOldTempFiles } from "$backend/temp.ts";
import { logger } from "$backend/logger.ts";
import { nextHour } from "$workers/periodic-task/next-at.ts";
import { PeriodicTask } from "../periodic-task-service.ts";

const maxOldFileAge = 1000 * 60 * 60 * 6;

export const cleanupTempFolder: PeriodicTask = {
    name: "cleanup-temp-folder",
    getNextAt: nextHour,
    async trigger(): Promise<void> {
        logger.info("Cleaning up temporary files older than 6 hours");
        await cleanupOldTempFiles(maxOldFileAge);
        logger.info("Finished cleaning up old temporary files");
    },
};
