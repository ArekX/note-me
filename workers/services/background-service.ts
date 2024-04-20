import { BusEvents } from "$backend/event-bus/bus-events.ts";
import { workerLogger } from "$backend/logger.ts";

export class BackgroundService {
    #worker: Worker | null = null;
    #started: boolean = false;
    #retriesLeft: number = +(Deno.env.get("ALLOWED_SERVICE_RETRIES") || 3);

    constructor(
        private readonly workerPath: string,
    ) {}

    send<T extends object>(message: T) {
        this.#worker?.postMessage(JSON.stringify(message));
    }

    get isStarted() {
        return this.#started;
    }

    stop() {
        this.#worker?.terminate();
        this.#started = false;
    }

    start() {
        this.#worker = new Worker(
            new URL(
                `../${this.workerPath}/worker.ts`,
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

            if (this.#retriesLeft > 0) {
                this.stop();
                this.start();
                event.preventDefault();
                this.#retriesLeft--;
            }
        };

        this.#started = true;
    }

    onMessage(callback: (message: BusEvents) => void) {
        this.#worker?.addEventListener("message", (event) => {
            callback(JSON.parse(event.data));
        });
    }
}
