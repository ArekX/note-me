/// <reference lib="webworker" />

import { ChannelMessage, WorkerChannel } from "./channel.ts";

export type ServiceReadyMessage = ChannelMessage<
    "ready" | "ready-ack",
    "unknown" | "app",
    "service-ready"
>;

export const workerNotifyReady = (channel: WorkerChannel) => {
    channel.send({
        to: "app",
        from: "unknown",
        type: "service-ready",
        message: "ready",
    } as ServiceReadyMessage);

    return new Promise<void>((resolve) => {
        channel.addOneTimeListener("service-ready", (message) => {
            if (message.message === "ready-ack") {
                resolve();
            }
        });
    });
};
export const hostWaitForWokerReady = (worker: Worker) => {
    return new Promise<void>((resolve) => {
        const waiter = (event: MessageEvent) => {
            const message = JSON.parse(event.data) as ServiceReadyMessage;
            if (
                message.type == "service-ready" && message.message === "ready"
            ) {
                worker.postMessage(
                    JSON.stringify({
                        to: "app",
                        from: "unknown",
                        type: "service-ready",
                        message: "ready-ack",
                    } as ServiceReadyMessage),
                );
                worker.removeEventListener("message", waiter);
                resolve();
            }
        };

        worker.addEventListener("message", waiter);
    });
};
