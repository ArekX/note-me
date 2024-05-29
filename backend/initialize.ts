import { migrator } from "$backend/migration-manager.ts";
import { webLogger } from "$backend/logger.ts";
import { initTempLocation } from "$backend/file-upload.ts";
import { createUserRecord } from "$backend/repository/user-repository.ts";

type InitializeMode = "development" | "production";

const initializeProduction = async () => {
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

export const initializeBackend = async (
    mode: InitializeMode = "production",
) => {
    webLogger.info("Initializing backend...");
    await initTempLocation();

    if (mode === "production") {
        await initializeProduction();
    }

    webLogger.info("Backend initialized.");
};
