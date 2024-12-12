import { logger } from "$backend/logger.ts";
import { services } from "./services/mod.ts";
import { connectHostChannelForDatabase } from "$db";
import {
    createRoutingChannel,
    createServiceChannel,
} from "$workers/channel/mod.ts";
import { connectHostChannelForProcessor } from "$workers/processor/host.ts";

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

const initializeDatabaseService = async () => {
    logger.info("Starting database service.");
    await services.database.start();

    connectHostChannelForDatabase(createServiceChannel(services.database));

    logger.info("Database service started successfully.");
};

export const initializeServices = async (): Promise<void> => {
    await initializeDatabaseService();

    const routingChannel = createRoutingChannel("host");
    connectHostChannelForProcessor(routingChannel);

    for (const [serviceName, service] of Object.entries(services)) {
        if (service.isStarted) {
            const serviceChannel = createServiceChannel(service);
            routingChannel.connectChannel(serviceChannel);
            serviceChannel.connectReceiver(routingChannel);
            continue;
        }

        if (!service.options.required && checkServiceDisabled(serviceName)) {
            continue;
        }

        logger.info("Starting service: {serviceName}", { serviceName });
        await service.start();
        const serviceChannel = createServiceChannel(service);
        routingChannel.connectChannel(serviceChannel);
        serviceChannel.connectReceiver(routingChannel);

        logger.debug(`Service '{serviceName}' started successfully.`, {
            serviceName,
        });
    }
    logger.info("All services started successfully.");
};
