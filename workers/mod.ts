import { logger } from "$backend/logger.ts";
import { services } from "./services/mod.ts";

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

export const initializeServices = async (): Promise<void> => {
    logger.info("Starting database service.");
    await services.database.start();
    logger.info("Database service started successfully.");

    for (const [serviceName, service] of Object.entries(services)) {
        if (
            !service.isStarted && !service.options.required &&
            checkServiceDisabled(serviceName)
        ) {
            continue;
        }

        logger.info("Starting service: {serviceName}", { serviceName });
        await service.start();

        logger.debug(`Service '{serviceName}' started successfully.`, {
            serviceName,
        });
    }
    logger.info("All services started successfully.");
};
