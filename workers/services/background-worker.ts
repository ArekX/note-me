import { BusEvents } from "$backend/event-bus/bus-events.ts";

export class BackgroundWorker<MessageType> {
    #worker: Worker | null = null;

    constructor(
        private readonly workerPath: string,
    ) {}

    send(message: MessageType) {
        this.#worker?.postMessage(JSON.stringify(message));
    }

    stop() {
        this.#worker?.terminate();
    }

    start() {
        this.#worker = new Worker(
            new URL(
                `../${this.workerPath}`,
                import.meta.url,
            ).href,
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
