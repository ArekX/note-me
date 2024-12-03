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

export interface WorkerMessage<T = unknown> {
    to: ServiceName | "*";
    key: string;
    data: T;
}

let connectedWorker: DedicatedWorkerGlobalScope | null = null;
let connectedWorkerName: ServiceName | null = null;
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
            if (Object.keys(connectedMessageListeners).length === 0) {
                return;
            }

            const message = JSON.parse(event.data) as WorkerMessage<T>;

            const messageListener = connectedMessageListeners[message.key];
            messageListener?.(message.data);
        },
    );
};

export const connectWorkerMessageListener = <T, K extends string>(
    key: K,
    onMessage: OnMessageHandler<T>,
) => {
    connectedMessageListeners[key] = onMessage as OnMessageHandler;
};

export const getConnectedWorkerName = () => connectedWorkerName;

export const workerSendMesage = <T, K>(
    to: ServiceName | "*",
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
