import { BackgroundService } from "./background-service.ts";

export const services = {
    websocket: new BackgroundService("websocket", { required: true }),
    database: new BackgroundService("database", { required: true }),
    "periodic-task": new BackgroundService("periodic-task"),
    processor: new BackgroundService("processor"),
} as const;
