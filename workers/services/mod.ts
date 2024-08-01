import { BackgroundService } from "./background-service.ts";

export const services = {
    websocket: new BackgroundService("websocket", { required: true }),
    periodicTasks: new BackgroundService("periodic-task"),
    processor: new BackgroundService("processor"),
} as const;
