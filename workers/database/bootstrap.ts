import { logger } from "$backend/logger.ts";
import { migrator } from "$backend/migration-manager.ts";
import { createUserRecord } from "$backend/repository/user-repository.ts";

const initializeFirstRun = async () => {
    logger.info("Creating administrator user...");
    await createUserRecord({
        name: "Administrator",
        username: "admin",
        password: "admin",
        role: "admin",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    logger.info(
        "Administrator user created, please use the following credentials to login:",
    );
    logger.info("Username: admin");
    logger.info("Password: admin");
};

export const bootstrap = async () => {
    if ((Deno.env.get("RUN_MIGRATIONS_ON_STARTUP") ?? "1") != "1") {
        return;
    }

    const isFirstRun = await migrator.isFirstRun();
    await migrator.migrateUp();

    if (isFirstRun) {
        logger.info("Setting up initial data on first run.");
        await initializeFirstRun();
        logger.info("First time setup complete!");
    }
};
