import { migrator } from "$backend/migration-manager.ts";
import { webLogger } from "$backend/logger.ts";
import { initTempLocation } from "$backend/file-upload.ts";
import { createUserRecord } from "$backend/repository/user-repository.ts";

const runMigrations = async () => {
    const isFirstRun = await migrator.isFirstRun();
    await migrator.migrateUp();

    if (isFirstRun) {
        webLogger.info("Setting up initial data on first run.");
        await initializeFirstRun();
        webLogger.info("First time setup complete!");
    }
};

const initializeFirstRun = async () => {
    webLogger.info("Creating administrator user...");
    await createUserRecord({
        name: "Administrator",
        username: "admin",
        password: "admin",
        role: "admin",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
};

export const initializeBackend = async () => {
    webLogger.info("Initializing backend...");
    await initTempLocation();

    if ((Deno.env.get("RUN_MIGRATIONS_ON_STARTUP") ?? "1") == "1") {
        await runMigrations();
    }

    webLogger.info("Backend initialized.");
};
