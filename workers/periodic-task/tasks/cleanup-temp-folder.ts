import { cleanupOldTempFiles } from "$backend/file-upload.ts";
import { EVERY_DAY, PeriodicTask } from "../periodic-task-service.ts";

// TODO: Test this
export const cleanupTempFolder: PeriodicTask = {
    name: "cleanup-temp",
    interval: EVERY_DAY,
    async trigger(): Promise<void> {
        await cleanupOldTempFiles();
    },
};
