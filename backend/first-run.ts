import { createUserRecord } from "$backend/repository/user-repository.ts";
import { webLogger } from "$backend/logger.ts";

export const initializeFirstRun = async () => {
    webLogger.info("Creating administrator user...");
    await createUserRecord({
        name: "Administrator",
        username: "admin",
        password: "admin",
        role: "admin",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
};
