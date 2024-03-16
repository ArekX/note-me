import { BusEvents } from "$backend/event-bus/bus-events.ts";

export interface BackgroundServiceWorker {
    start(): void;
    stop(): void;
}

export class BackgroundService<MessageType> {
    #worker: Worker | null = null;

    constructor(
        private readonly serviceName: string,
    ) {}

    send(message: MessageType) {
        this.#worker?.postMessage(JSON.stringify(message));
    }

    stop() {
        this.#worker?.terminate();
    }

    start() {
        this.#worker = new Worker(
            new URL(`./webworkers/${this.serviceName}.ts`, import.meta.url)
                .href,
            {
                type: "module",
            },
        );
    }

    onMessage(callback: (message: BusEvents) => void) {
        this.#worker?.addEventListener("message", (event) => {
            callback(JSON.parse(event.data));
        });
    }
}
