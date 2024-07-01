import { removeExpiredPublicShares } from "$backend/repository/note-share-repository.ts";
import { EVERY_DAY, PeriodicTask } from "../periodic-task-service.ts";

// TODO: Test this
export const removeExpiredShareLinks: PeriodicTask = {
    name: "cleanup-expired-share-links",
    interval: EVERY_DAY,
    async trigger(): Promise<void> {
        await removeExpiredPublicShares();
    },
};
