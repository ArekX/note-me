import { flushFileLogs, webLogger } from "$backend/logger.ts";
import { stopBackgroundServices } from "../workers/mod.ts";

export const setupCleanupActions = () => {
    Deno.addSignalListener("SIGINT", () => {
        webLogger.info("Shutting down background services...");
        stopBackgroundServices();
        webLogger.info("Background services stopped.");
        flushFileLogs();
        Deno.exit();
    });
    webLogger.debug("Cleanup actions for graceful shutdown set up.");
};
