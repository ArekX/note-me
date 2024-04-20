import { eventBus } from "$backend/event-bus/mod.ts";
import { webLogger } from "$backend/logger.ts";
import { services } from "./services/mod.ts";

const checkServiceDisabled = (serviceName: string): boolean => {
    const serviceDisabledEnvName = "DISABLE_SERVICE_" +
        serviceName.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();

    webLogger.debug(
        "Checking if service is disabled by environment variable '{name}'",
        {
            name: serviceDisabledEnvName,
        },
    );

    const isServiceDisabled = !!Deno.env.get(serviceDisabledEnvName);

    if (isServiceDisabled) {
        webLogger.info(
            `Service '{name}' has been disabled by environment variable '{variable}'.`,
            {
                name: serviceName,
                variable: serviceDisabledEnvName,
            },
        );
        return true;
    }

    webLogger.debug("Service is not disabled.");

    return false;
};

export const startBackgroundServices = (): void => {
    for (const [serviceName, service] of Object.entries(services)) {
        if (checkServiceDisabled(serviceName)) {
            continue;
        }

        webLogger.info(`Starting background service: ${serviceName}`);
        service.start();
        webLogger.debug("Background service started.");
        service.onMessage((message) => eventBus.emit(message));
    }
    webLogger.debug("All background services started");
};
