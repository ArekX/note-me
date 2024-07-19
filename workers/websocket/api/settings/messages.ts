import { Message } from "$workers/websocket/types.ts";
import { PeriodicTaskRecord } from "$backend/repository/periodic-task-repository.ts";

type SettingsMessage<Type, Data = unknown> = Message<
    "settings",
    Type,
    Data
>;

export type GetPeriodicTasksMessage = SettingsMessage<
    "getPeriodicTasks"
>;

export type GetPeriodicTasksResponse = SettingsMessage<
    "getPeriodicTasksResponse",
    { tasks: PeriodicTaskRecord[] }
>;

export type SettingsFrontendResponse = GetPeriodicTasksResponse;

export type SettingsFrontendMessage = GetPeriodicTasksMessage;
