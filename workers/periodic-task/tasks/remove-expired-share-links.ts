import { removeExpiredPublicShares } from "$backend/repository/note-share-repository.ts";
import { logger } from "$backend/logger.ts";
import { PeriodicTask } from "../periodic-task-service.ts";
import { startOfNextDay } from "$workers/periodic-task/next-at.ts";

// TODO: Test this
export const removeExpiredShareLinks: PeriodicTask = {
    name: "cleanup-expired-share-links",
    getNextAt: startOfNextDay,
    async trigger(): Promise<void> {
        logger.info("Removing expired public share links");
        await removeExpiredPublicShares();
        logger.info("Finished removing expired public share links");
    },
};
