import { initializeServices } from "./workers/mod.ts";
import { loadEnvironment } from "$backend/env.ts";
import { setLoggerName } from "$backend/logger.ts";
import { initTempLocation } from "$backend/temp.ts";

export const bootstrap = async () => {
    loadEnvironment();

    setLoggerName("backend");

    await initTempLocation();

    await initializeServices();
};
