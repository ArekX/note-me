import { db } from "$backend/database.ts";
import { getCurrentUnixTimestamp } from "$lib/time/unix.ts";
import { PeriodicTaskScheduleTable } from "$types";

export const savePeriodicTaskRun = async (
    task_identifier: string,
    next_run_at: number,
    is_successful?: boolean,
    fail_reason?: string | null,
) => {
    const task = await db.selectFrom("periodic_task_schedule")
        .where("task_identifier", "=", task_identifier)
        .select(["id"])
        .executeTakeFirst();

    if (task) {
        const data: Partial<
            Pick<
                PeriodicTaskScheduleTable,
                | "next_run_at"
                | "last_fail_reason"
                | "last_successful_run_at"
                | "last_fail_run_at"
                | "is_last_run_successful"
            >
        > = {
            next_run_at,
        };

        if (!is_successful) {
            data.is_last_run_successful = false;
            data.last_fail_reason = fail_reason ?? "Unknown error";
            data.last_fail_run_at = getCurrentUnixTimestamp();
        } else {
            data.is_last_run_successful = true;
            data.last_successful_run_at = getCurrentUnixTimestamp();
        }

        await db.updateTable("periodic_task_schedule")
            .set(data)
            .where("id", "=", task.id)
            .execute();
    }

    if (!task) {
        await db.insertInto("periodic_task_schedule")
            .values({
                task_identifier,
                next_run_at,
            })
            .execute();
    }
};

export const findPendingPeriodicTasks = async () => {
    return await db.selectFrom("periodic_task_schedule")
        .select(["task_identifier", "next_run_at"])
        .execute();
};

export const getScheduledTasks = async (task_identifiers: string[]) => {
    return (await db.selectFrom("periodic_task_schedule")
        .where("task_identifier", "in", task_identifiers)
        .select(["task_identifier"])
        .execute()).map((task) => task.task_identifier);
};
