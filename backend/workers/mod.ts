import { eventBus } from "$backend/event-bus/mod.ts";
import { webLogger } from "$backend/logger.ts";
import { BackgroundService } from "./background-service.ts";
import { WebSocketMessage } from "./webworkers/websocket-worker.ts";

export interface BackgroundServices {
    services: {
        websocketService: BackgroundService<WebSocketMessage>;
        timingService: BackgroundService<unknown>;
    };
    startAll(): void;
    stopAll(): void;
}

export const backgroundServices: BackgroundServices = {
    services: {
        websocketService: new BackgroundService("websocket-worker"),
        timingService: new BackgroundService("timing-worker"),
    },
    startAll(): void {
        for (const [serviceName, service] of Object.entries(this.services)) {
            webLogger.info(`Starting background service: ${serviceName}`);
            service.start();
            webLogger.debug("Background service started.");
            service.onMessage((message) => eventBus.emit(message));
        }
    },
    stopAll(): void {
        for (const [serviceName, service] of Object.entries(this.services)) {
            webLogger.info(`Stopping background service: ${serviceName}`);
            service.stop();
            webLogger.debug("Background service stopped.");
        }
    },
};
