import { db } from "$backend/database.ts";
import { getCurrentUnixTimestamp } from "$backend/time.ts";

export const savePeriodicTaskRun = async (
    task_identifier: string,
    next_run_at: number,
) => {
    const task = await db.selectFrom("periodic_task_schedule")
        .where("task_identifier", "=", task_identifier)
        .select(["id"])
        .executeTakeFirst();

    if (task) {
        await db.updateTable("periodic_task_schedule")
            .set({
                next_run_at,
            })
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
        .where("next_run_at", "<=", getCurrentUnixTimestamp())
        .execute();
};
