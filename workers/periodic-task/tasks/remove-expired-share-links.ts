import { removeExpiredPublicShares } from "$backend/repository/note-share-repository.ts";
import { workerLogger } from "$backend/logger.ts";
import { EVERY_DAY, PeriodicTask } from "../periodic-task-service.ts";

// TODO: Test this
export const removeExpiredShareLinks: PeriodicTask = {
    name: "cleanup-expired-share-links",
    interval: EVERY_DAY,
    async trigger(): Promise<void> {
        workerLogger.info("Removing expired public share links");
        await removeExpiredPublicShares();
        workerLogger.info("Finished removing expired public share links");
    },
};
