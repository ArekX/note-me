import { flushFileLogs, webLogger } from "$backend/logger.ts";
import { stopBackgroundServices } from "../workers/mod.ts";

export const setupCleanupActions = () => {
    Deno.addSignalListener("SIGINT", () => {
        webLogger.info("Shutting down background services...");
        stopBackgroundServices();
        flushFileLogs();
        Deno.exit();
    });
};
