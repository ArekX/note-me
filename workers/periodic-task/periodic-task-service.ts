import { logger } from "$backend/logger.ts";
import { getCurrentUnixTimestamp, unixToDate } from "$lib/time/unix.ts";

import { repository } from "$db";
import { waitUntilChannelReady } from "$workers/periodic-task/channel.ts";

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
    const periodicTasks = await repository.periodicTask
        .findPendingPeriodicTasks();

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

    await repository.periodicTask.deleteUnusedPeriodicTasks(tasks);
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

    await repository.periodicTask.savePeriodicTaskRun({
        task_identifier: handler.task.name,
        next_run_at: handler.task.getNextAt(getCurrentUnixTimestamp()),
        is_successful: isSuccessful,
        fail_reason: failureReason,
    });
};

const scheduleFirstTimeJobs = async () => {
    const now = getCurrentUnixTimestamp();
    const tasksInUse = [];

    const tasks = [];

    for (const handler of handlers) {
        tasks.push(handler.task.name);
    }

    const scheduledTasks = await repository.periodicTask.getScheduledTasks(
        tasks,
    );

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
        await repository.periodicTask.savePeriodicTaskRun({
            task_identifier: handler.task.name,
            next_run_at: handler.task.getNextAt(now),
        });
        tasksInUse.push(handler.task.name);
    }
};

const start = async () => {
    logger.info("Periodic task service started.");

    await waitUntilChannelReady();

    await deleteInvalidPeriodicTasks();
    await restorePreviouslyScheduledTasks();
    await scheduleFirstTimeJobs();

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
        await repository.periodicTask.savePeriodicTaskRun({
            task_identifier: handler.task.name,
            next_run_at: handler.next_at,
            is_successful: true,
            fail_reason: null,
        });
    }
};

export const periodicTaskService = {
    start,
    registerPeriodicTask,
    storeScheduledTasks,
};
