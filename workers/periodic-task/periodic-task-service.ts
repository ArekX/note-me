import { workerLogger } from "$backend/logger.ts";
import {
    findPendingPeriodicTasks,
    savePeriodicTaskRun,
} from "$backend/repository/periodic-task-repository.ts";
import { getCurrentUnixTimestamp } from "$backend/time.ts";

export const EVERY_MINUTE = 1;
export const EVERY_DAY = 24 * 60;

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
    return new Promise((resolve) => setTimeout(resolve, waitTime * 60 * 1000));
};

const registerPeriodicTask = (task: PeriodicTask) => {
    handlers.add({
        leftMinutes: task.interval,
        task,
    });
};

const runPreviouslyScheduledTasks = async () => {
    const periodicTasks = await findPendingPeriodicTasks();

    for (const handler of handlers) {
        const task = periodicTasks.find((task) =>
            task.task_identifier === handler.task.name
        );
        if (task) {
            workerLogger.info(
                "Found previously scheduled periodic task '{task}'",
                {
                    task: handler.task.name,
                },
            );

            await triggerHandler(handler);
        }
    }
};

const triggerHandler = async (handler: RegisteredTask) => {
    try {
        workerLogger.debug("Running periodic task '{task}'", {
            task: handler.task.name,
        });
        await handler.task.trigger();
        workerLogger.debug("Periodic task '{task}' finished", {
            task: handler.task.name,
        });
    } catch (e) {
        workerLogger.error(
            "Error occurred when runnig periodic task '{task}': {error}",
            {
                task: handler.task.name,
                error: e.message,
            },
        );
    }

    await savePeriodicTaskRun(
        handler.task.name,
        getCurrentUnixTimestamp() + handler.task.interval * 60,
    );
};

const start = async ({
    tickTime = EVERY_MINUTE,
}: PeriodicTimerService = {}) => {
    workerLogger.info("Periodic task service started.");

    await runPreviouslyScheduledTasks();

    while (true) {
        await waitForNextTick(tickTime);
        workerLogger.debug("Tick time passed. Running periodic tasks.");
        for (const handler of handlers) {
            handler.leftMinutes--;

            if (handler.leftMinutes <= 0) {
                await triggerHandler(handler);
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
