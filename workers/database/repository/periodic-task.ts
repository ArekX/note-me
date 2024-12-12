import { DbHandlerMap, DbRequest } from "$workers/database/message.ts";
import {
    deleteUnusedPeriodicTasks,
    findPendingPeriodicTasks,
    getAllPeriodicTasks,
    getScheduledTasks,
    PeriodicTaskRecord,
    savePeriodicTaskRun,
} from "../query/periodic-task-repository.ts";

type PeriodicTaskRequest<Key extends string, Request, Response> = DbRequest<
    "periodicTask",
    "repository",
    Key,
    Request,
    Response
>;

type SavePeriodicTaskRun = PeriodicTaskRequest<"savePeriodicTaskRun", {
    task_identifier: string;
    next_run_at: number;
    is_successful?: boolean;
    fail_reason?: string | null;
}, void>;

type FindPendingPeriodicTasks = PeriodicTaskRequest<
    "findPendingPeriodicTasks",
    void,
    PeriodicTaskRecord[]
>;

type GetScheduledTasks = PeriodicTaskRequest<
    "getScheduledTasks",
    string[],
    string[]
>;

type GetAllPeriodicTasks = PeriodicTaskRequest<
    "getAllPeriodicTasks",
    void,
    PeriodicTaskRecord[]
>;

type DeleteUnusedPeriodicTasks = PeriodicTaskRequest<
    "deleteUnusedPeriodicTasks",
    string[],
    void
>;

export type PeriodicTaskRepository =
    | SavePeriodicTaskRun
    | FindPendingPeriodicTasks
    | GetScheduledTasks
    | GetAllPeriodicTasks
    | DeleteUnusedPeriodicTasks;

export const periodicTask: DbHandlerMap<PeriodicTaskRepository> = {
    savePeriodicTaskRun: (
        { task_identifier, next_run_at, is_successful, fail_reason },
    ) => savePeriodicTaskRun(
        task_identifier,
        next_run_at,
        is_successful,
        fail_reason,
    ),
    findPendingPeriodicTasks,
    getScheduledTasks: (task_identifiers) =>
        getScheduledTasks(task_identifiers),
    getAllPeriodicTasks,
    deleteUnusedPeriodicTasks: (identifiersInUse) =>
        deleteUnusedPeriodicTasks(identifiersInUse),
};
