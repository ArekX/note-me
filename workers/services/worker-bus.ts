/// <reference lib="webworker" />

import {
    BackgroundService,
    OnMessageHandler,
} from "$workers/services/background-service.ts";
import { services } from "$workers/services/mod.ts";

type ServiceName = keyof typeof services;

export interface WorkerMessage<T = unknown> {
    to: ServiceName | "*";
    data: T;
}

let connectedWorker: DedicatedWorkerGlobalScope | null = null;

export const connectWorkerToBus = <T>(
    worker: DedicatedWorkerGlobalScope,
    onMessage?: (message: T) => void,
) => {
    if (onMessage) {
        worker.addEventListener(
            "message",
            (event) => {
                const message = JSON.parse(event.data) as WorkerMessage<T>;
                onMessage(message.data);
            },
        );
    }

    connectedWorker = worker;
};

export const workerSendMesage = <T>(to: ServiceName | "*", message: T) => {
    if (!connectedWorker) {
        throw new Error("No worker is connected to the bus.");
    }

    connectedWorker.postMessage(JSON.stringify({
        to,
        data: message,
    }));
};

export const listenServiceBroadcasts = <T>(
    service: BackgroundService,
    onMessage: (message: T) => void,
) => {
    service.onMessage(
        ((message: WorkerMessage<T>) => {
            if (message.to === "*") {
                onMessage(message.data);
            }
        }) as OnMessageHandler,
    );
};

export const connectServiceToBus = (service: BackgroundService) => {
    service.onMessage(
        ((message: WorkerMessage) => {
            if (message.to === "*") {
                for (const destinationService of Object.values(services)) {
                    destinationService.send(message);
                }

                return;
            }

            const destinationService = services[message.to ?? ""];

            if (destinationService) {
                destinationService.send(message);
            }
        }) as OnMessageHandler,
    );
};
