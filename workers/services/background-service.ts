import { BusEvents } from "$backend/event-bus/bus-events.ts";
import { workerLogger } from "$backend/logger.ts";

export class BackgroundService {
    #worker: Worker | null = null;

    constructor(
        private readonly workerPath: string,
    ) {}

    send<T extends object>(message: T) {
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

        this.#worker.onmessageerror = (event) => {
            workerLogger.error(
                "Received unserializeable message from worker '{worker}': {error}",
                {
                    worker: this.workerPath,
                },
            );
            event.preventDefault();
        };

        this.#worker.onerror = (event) => {
            workerLogger.error(
                "Restarting worker '{worker}' due to error '{error}' at {file}:{line}.",
                {
                    worker: this.workerPath,
                    error: event.message,
                    file: event.filename,
                    line: event.lineno,
                },
            );
            this.stop();
            this.start();
            event.preventDefault();
        };
    }

    onMessage(callback: (message: BusEvents) => void) {
        this.#worker?.addEventListener("message", (event) => {
            callback(JSON.parse(event.data));
        });
    }
}
