import { initializeServices } from "$workers/mod.ts";
import { services } from "$workers/services/mod.ts";
import { loadEnvironment } from "$backend/env.ts";
import { setLoggerName } from "$backend/logger.ts";
import { initTempLocation } from "$backend/temp.ts";

// The dev server re-evaluates the module graph on restarts, which creates a
// fresh `services` registry while the previously spawned workers keep
// running. Stop the old workers first so that re-initialization does not
// leak workers or fail with ports that are still in use.
const SERVICES_FLAG = "__noteMeServices";

interface ServiceLike {
    stop: () => void;
}

export const bootstrap = async () => {
    const holder = globalThis as {
        [SERVICES_FLAG]?: Record<string, ServiceLike>;
    };

    const previousServices = holder[SERVICES_FLAG];

    if (previousServices === services as Record<string, ServiceLike>) {
        return;
    }

    if (previousServices) {
        for (const service of Object.values(previousServices)) {
            service.stop();
        }

        // Give the OS a moment to release the ports held by the
        // terminated workers before the new ones bind them.
        await new Promise((resolve) => setTimeout(resolve, 500));
    }

    holder[SERVICES_FLAG] = services;

    loadEnvironment();

    setLoggerName("backend");

    await initTempLocation();

    await initializeServices();
};
