import { BackgroundWorker } from "./background-worker.ts";

export const services = {
    websocket: new BackgroundWorker("websocket/worker.ts"),
    timer: new BackgroundWorker("timers/worker.ts"),
};
