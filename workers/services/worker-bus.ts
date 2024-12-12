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

export type ServiceName = keyof typeof services;

type Destination = ServiceName | "*" | "app";

export interface WorkerMessage<T = unknown> {
    to: Destination;
    key: string;
    data: T;
}

let connectedWorker: DedicatedWorkerGlobalScope | null = null;
let connectedWorkerName: ServiceName | "app" | null = null;
const connectedMessageListeners: { [key: string]: OnMessageHandler } = {};

export const connectWorkerToBus = <T>(
    name: ServiceName,
    worker: DedicatedWorkerGlobalScope,
) => {
    connectedWorkerName = name;
    connectedWorker = worker;

    worker.addEventListener(
        "message",
        (event) => {
            const message = JSON.parse(event.data) as WorkerMessage<T>;
            handleListenerMessage(message);
        },
    );
};

const handleListenerMessage = <T>(message: WorkerMessage<T>) => {
    if (Object.keys(connectedMessageListeners).length === 0) {
        return;
    }

    const messageListener = connectedMessageListeners[message.key];
    messageListener?.(message.data);
};

export const connectWorkerMessageListener = <T, K extends string>(
    key: K,
    onMessage: OnMessageHandler<T>,
) => {
    connectedMessageListeners[key] = onMessage as OnMessageHandler;
};

export const getConnectedWorkerName = () => connectedWorkerName;

export const workerSendMesage = <T, K>(
    to: Destination,
    key: K,
    message: T,
) => {
    if (!connectedWorker) {
        throw new Error("No worker is connected to the bus.");
    }

    connectedWorker.postMessage(JSON.stringify({
        to,
        key,
        data: message,
    } as WorkerMessage<T>));
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

    if (message.to === "app") {
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

export const connectAppToService = (
    service: BackgroundService,
) => {
    connectedWorkerName = "app";
    service.onMessage(
        ((message: WorkerMessage) => {
            if (message.to === "app") {
                handleListenerMessage(message);
            }
        }) as OnMessageHandler,
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
