import { logger } from "$backend/logger.ts";
import {
    deleteUnusedPeriodicTasks,
    findPendingPeriodicTasks,
    getScheduledTasks,
    savePeriodicTaskRun,
} from "$backend/repository/periodic-task-repository.ts";
import { getCurrentUnixTimestamp, unixToDate } from "$lib/time/unix.ts";

import { sendServiceReadyMessage } from "$workers/services/worker-bus.ts";
import { db } from "$workers/database/lib.ts";

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

const waitForNextTick = (): Promise<void> => {
    return new Promise((resolve) => {
        const now = new Date();

        const syncWait = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
        logger.debug(
            "Waiting for {time} seconds for next tick",
            {
                time: (syncWait / 1000).toFixed(2),
            },
        );
        setTimeout(resolve, syncWait);
    });
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

const deleteInvalidPeriodicTasks = async () => {
    const tasks = [];

    for (const handler of handlers) {
        tasks.push(handler.task.name);
    }

    await deleteUnusedPeriodicTasks(tasks);
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
    } catch (e: unknown) {
        logger.error(
            "Error occurred when runnig periodic task '{task}': {error}",
            {
                task: handler.task.name,
                error: (e as Error).message,
            },
        );

        failureReason = (e as Error).message ?? "Unknown error";
    }

    await savePeriodicTaskRun(
        handler.task.name,
        handler.task.getNextAt(getCurrentUnixTimestamp()),
        isSuccessful,
        failureReason,
    );
};

const scheduleFirstTimeJobs = async () => {
    const now = getCurrentUnixTimestamp();
    const tasksInUse = [];

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
        tasksInUse.push(handler.task.name);
    }
};

const start = async () => {
    logger.info("Periodic task service started.");

    console.log(
        await db.backupTarget.getBackupTargets(),
    );

    await deleteInvalidPeriodicTasks();
    await restorePreviouslyScheduledTasks();
    await scheduleFirstTimeJobs();

    sendServiceReadyMessage();

    while (true) {
        const now = getCurrentUnixTimestamp();
        for (const handler of handlers) {
            if (now >= handler.next_at) {
                await triggerHandler(handler);
                handler.next_at = handler.task.getNextAt(
                    getCurrentUnixTimestamp(),
                );
            }
        }
        await waitForNextTick();
    }
};

const storeScheduledTasks = async () => {
    logger.info("Storing current scheduled task times into database.");
    for (const handler of handlers) {
        await savePeriodicTaskRun(
            handler.task.name,
            handler.next_at,
            true,
            null,
        );
    }
};

export const periodicTaskService = {
    start,
    registerPeriodicTask,
    storeScheduledTasks,
};
