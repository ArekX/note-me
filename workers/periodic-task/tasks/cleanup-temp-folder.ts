import { cleanupOldTempFiles } from "$backend/file-upload.ts";
import { PeriodicTask } from "../periodic-task-service.ts";

const INTERVAL_24_HOURS = 86400;

// TODO: Test this
export const cleanupTempFolder: PeriodicTask = {
    name: "cleanup-temp",
    interval: INTERVAL_24_HOURS,
    async trigger(): Promise<void> {
        await cleanupOldTempFiles();
    },
};
