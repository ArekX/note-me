/// <reference lib="webworker" />

import {
    BackgroundService,
    OnMessageHandler,
} from "$workers/services/background-service.ts";
import { services } from "$workers/services/mod.ts";

export interface ServiceReadyMessage {
    from: ServiceName;
    type: "ready";
}

type ServiceName = keyof typeof services;

export interface WorkerMessage<T = unknown> {
    to: ServiceName | "*";
    data: T;
}

let connectedWorker: DedicatedWorkerGlobalScope | null = null;
let connectedWorkerName: ServiceName | null = null;

export const connectWorkerToBus = <T>(
    name: ServiceName,
    worker: DedicatedWorkerGlobalScope,
    onMessage?: (message: T) => void,
) => {
    connectedWorkerName = name;
    connectedWorker = worker;

    if (onMessage) {
        worker.addEventListener(
            "message",
            (event) => {
                const message = JSON.parse(event.data) as WorkerMessage<T>;
                onMessage(message.data);
            },
        );
    }
};

export const getConnectedWorkerName = () => connectedWorkerName;

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

export const serviceBusSendMessage = <T>(
    message: WorkerMessage<T>,
) => {
    if (message.to === "*") {
        for (const destinationService of Object.values(services)) {
            if (destinationService.isStarted) {
                destinationService.send(message);
            }
        }

        return;
    }

    const destinationService = services[message.to ?? ""];

    if (destinationService) {
        destinationService.send(message);
    }
};

export const connectServiceToBus = (service: BackgroundService) => {
    service.onMessage(
        ((message: WorkerMessage) =>
            serviceBusSendMessage(message)) as OnMessageHandler,
    );
};

export const waitUntilServiceIsReady = (service: BackgroundService) => {
    return new Promise<void>((resolve) => {
        const serviceListener = service.onMessage(
            ((message: ServiceReadyMessage) => {
                if (message.type === "ready" && message.from === service.name) {
                    service.removeMessageListener(
                        serviceListener as OnMessageHandler,
                    );
                    resolve();
                }
            }) as OnMessageHandler,
        );
    });
};

export const sendServiceReadyMessage = () => {
    connectedWorker?.postMessage(
        JSON.stringify({
            from: connectedWorkerName,
            type: "ready",
        } as ServiceReadyMessage),
    );
};
