import { BackgroundService } from "./background-service.ts";

export const services = {
    websocket: new BackgroundService("websocket/worker.ts"),
    periodicTask: new BackgroundService("periodic-task/worker.ts"),
};
