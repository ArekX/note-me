import { logger } from "$backend/logger.ts";
import { PeriodicTask } from "../periodic-task-service.ts";
import { startOfNextDay } from "../next-at.ts";
import { db } from "$workers/database/lib.ts";

export const removeExpiredShareLinks: PeriodicTask = {
    name: "remove-expired-share-links",
    getNextAt: startOfNextDay,
    async trigger(): Promise<void> {
        logger.info("Removing expired public share links");
        await db.noteShare.removeExpiredPublicShares();
        logger.info("Finished removing expired public share links");
    },
};
