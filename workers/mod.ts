import { logger } from "$backend/logger.ts";
import { services } from "./services/mod.ts";
import { BackendMessage } from "$workers/websocket/websocket-backend.ts";
import { listenServiceBroadcasts } from "$workers/services/worker-bus.ts";
import { reloadDatabase } from "$backend/database.ts";

const checkServiceDisabled = (serviceName: string): boolean => {
    const serviceDisabledEnvName = "DISABLE_SERVICE_" +
        serviceName.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();

    logger.debug(
        "Checking if service '{serviceName}' is disabled by environment variable '{name}'",
        {
            serviceName,
            name: serviceDisabledEnvName,
        },
    );

    const isServiceDisabled = Deno.env.get(serviceDisabledEnvName) == "1";

    if (isServiceDisabled) {
        logger.info(
            `Service '{name}' has been disabled by environment variable '{variable}'.`,
            {
                name: serviceName,
                variable: serviceDisabledEnvName,
            },
        );
        return true;
    }

    logger.debug("Service is not disabled.");

    return false;
};

export const initializeWorkers = (): void => {
    for (const [serviceName, service] of Object.entries(services)) {
        if (!service.options.required && checkServiceDisabled(serviceName)) {
            continue;
        }

        logger.info(`Starting background service: ${serviceName}`);
        service.start();

        listenServiceBroadcasts(service, (message: BackendMessage) => {
            if (message.type === "databaseRestored") {
                logger.info("Database restored. Reloading database.");
                reloadDatabase();
            }
        });

        logger.debug("Background service started.");
    }
    logger.debug("All background services started");
};
