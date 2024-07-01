import { workerLogger } from "$backend/logger.ts";

export const EVERY_MINUTE = 60 * 1000;
export const EVERY_DAY = 86400;

export interface PeriodicTask {
    name: string;
    interval: number;
    trigger: () => Promise<void>;
}

interface RegisteredTask {
    leftMinutes: number;
    task: PeriodicTask;
}

const handlers: Set<RegisteredTask> = new Set();

interface PeriodicTimerService {
    tickTime?: number;
}

const waitForNextTick = (waitTime: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, waitTime));
};

const registerPeriodicTask = (task: PeriodicTask) => {
    handlers.add({
        leftMinutes: task.interval,
        task,
    });
};

const start = async ({
    tickTime = EVERY_MINUTE,
}: PeriodicTimerService = {}) => {
    workerLogger.info("Periodic task service started.");

    while (true) {
        await waitForNextTick(tickTime);
        workerLogger.debug("Tick time passed. Running periodic tasks.");
        for (const handler of handlers) {
            handler.leftMinutes--;

            if (handler.leftMinutes <= 0) {
                try {
                    // TODO: We need persistence to run the task in case of shutdown
                    await handler.task.trigger();
                } catch (e) {
                    workerLogger.error(
                        "Error occurred when runnig periodic task '{task}': {error}",
                        {
                            task: handler.task.name,
                            error: e.message,
                        },
                    );
                }

                handler.leftMinutes = handler.task.interval;
            }
        }
        workerLogger.debug(
            "Periodic task run finished. Waiting for next tick.",
        );
    }
};

export const periodicTaskService = {
    start,
    registerPeriodicTask,
};
