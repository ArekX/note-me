import { BackgroundService } from "./background-service.ts";

export const services = {
    websocket: new BackgroundService("websocket"),
    periodicTasks: new BackgroundService("periodic-task"),
};
