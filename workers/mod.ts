import { eventBus } from "$backend/event-bus/mod.ts";
import { webLogger } from "$backend/logger.ts";
import { services } from "./services/mod.ts";

export const startBackgroundServices = (): void => {
    for (const [serviceName, service] of Object.entries(services)) {
        webLogger.info(`Starting background service: ${serviceName}`);
        service.start();
        webLogger.debug("Background service started.");
        service.onMessage((message) => eventBus.emit(message));
    }
    webLogger.debug("All background services started");
};

export const stopBackgroundServices = (): void => {
    for (const [serviceName, service] of Object.entries(services)) {
        webLogger.info(`Stopping background service: ${serviceName}`);
        service.stop();
        webLogger.debug("Background service stopped.");
    }
    webLogger.debug("All background services stopped.");
};
