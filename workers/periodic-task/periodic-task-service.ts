import { logger } from "$backend/logger.ts";
import {
    findPendingPeriodicTasks,
    getScheduledTasks,
    savePeriodicTaskRun,
} from "$backend/repository/periodic-task-repository.ts";
import { getCurrentUnixTimestamp, unixToDate } from "$lib/time/unix.ts";

export const MINUTE_INTERVAL = 1;

export interface PeriodicTask {
    name: string;
    getNextAt: (currentTime: number) => number;
    trigger: () => Promise<void>;
}

interface RegisteredTask {
    next_at: number;
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
        next_at: task.getNextAt(getCurrentUnixTimestamp()),
        task,
    });
};

const restorePreviouslyScheduledTasks = async () => {
    const periodicTasks = await findPendingPeriodicTasks();

    for (const handler of handlers) {
        const task = periodicTasks.find((task) =>
            task.task_identifier === handler.task.name
        );
        if (task) {
            logger.info(
                "Found previously scheduled periodic task '{task}' scheduled at {nextAt}",
                {
                    task: handler.task.name,
                    nextAt: unixToDate(task.next_run_at).toISOString(),
                },
            );

            handler.next_at = task.next_run_at;
        }
    }
};

const triggerHandler = async (handler: RegisteredTask) => {
    let failureReason: string | null = null;
    let isSuccessful = false;
    try {
        logger.debug("Running periodic task '{task}'", {
            task: handler.task.name,
        });
        await handler.task.trigger();
        logger.debug("Periodic task '{task}' finished", {
            task: handler.task.name,
        });
        isSuccessful = true;
    } catch (e) {
        logger.error(
            "Error occurred when runnig periodic task '{task}': {error}",
            {
                task: handler.task.name,
                error: e.message,
            },
        );

        failureReason = e.message || e || "Unknown error";
    }

    await savePeriodicTaskRun(
        handler.task.name,
        handler.task.getNextAt(getCurrentUnixTimestamp()),
        isSuccessful,
        failureReason,
    );
};

const synchronizeWithClock = (): Promise<void> =>
    new Promise((resolve) => {
        if (new Date().getSeconds() === 0) {
            resolve();
            logger.info("Synchronized with clock. No need to wait.");
            return;
        }

        logger.info(
            "Synchronizing with clock up to the current minute started at {date}",
            {
                date: new Date().toISOString(),
            },
        );
        const intervalId = setInterval(() => {
            const now = new Date();
            const seconds = now.getSeconds();
            if (seconds === 0) {
                resolve();
                clearInterval(intervalId);
                logger.info("Synchronization finished at: {date}", {
                    date: now.toISOString(),
                });
            }
        }, 1000);
    });

const scheduleFirstTimeJobs = async () => {
    const now = getCurrentUnixTimestamp();

    const tasks = [];

    for (const handler of handlers) {
        tasks.push(handler.task.name);
    }

    const scheduledTasks = await getScheduledTasks(tasks);

    const unscheduledTasks = tasks.filter((task) =>
        !scheduledTasks.includes(task)
    );

    for (const handler of handlers) {
        if (!unscheduledTasks.includes(handler.task.name)) {
            continue;
        }

        logger.info(
            "Scheduling first time run for {task}",
            {
                task: handler.task.name,
            },
        );
        await savePeriodicTaskRun(
            handler.task.name,
            handler.task.getNextAt(now),
        );
    }
};

const start = async ({
    tickTime = MINUTE_INTERVAL,
}: PeriodicTimerService = {}) => {
    logger.info("Periodic task service started.");
    await restorePreviouslyScheduledTasks();
    await synchronizeWithClock();
    await scheduleFirstTimeJobs();

    while (true) {
        const now = getCurrentUnixTimestamp();
        logger.debug("Tick time passed. Running periodic tasks.");
        for (const handler of handlers) {
            if (now >= handler.next_at) {
                await triggerHandler(handler);
                handler.next_at = handler.task.getNextAt(
                    getCurrentUnixTimestamp(),
                );
            }
        }
        logger.debug(
            "All periodic tasks for this time have finished. Waiting for next tick.",
        );
        await waitForNextTick(tickTime);
    }
};

export const periodicTaskService = {
    start,
    registerPeriodicTask,
};
