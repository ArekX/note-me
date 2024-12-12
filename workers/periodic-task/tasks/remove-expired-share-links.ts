import { logger } from "$backend/logger.ts";
import { PeriodicTask } from "../periodic-task-service.ts";
import { startOfNextDay } from "../next-at.ts";
import { repository } from "$db";

export const removeExpiredShareLinks: PeriodicTask = {
    name: "remove-expired-share-links",
    getNextAt: startOfNextDay,
    async trigger(): Promise<void> {
        logger.info("Removing expired public share links");
        await repository.noteShare.removeExpiredPublicShares();
        logger.info("Finished removing expired public share links");
    },
};
