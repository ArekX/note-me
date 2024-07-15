import { logger } from "$backend/logger.ts";
import { connectServiceToBus } from "$workers/services/worker-bus.ts";

interface BackgroundServiceOptions {
    required: boolean;
}

export type OnMessageHandler<T = unknown> = (message: T) => void;

export class BackgroundService {
    #worker: Worker | null = null;
    #started: boolean = false;
    #retriesLeft: number = +(Deno.env.get("ALLOWED_SERVICE_RETRIES") || 3);

    constructor(
        private readonly workerPath: string,
        public readonly options: BackgroundServiceOptions = {
            required: false,
        },
    ) {}

    send<T>(message: T) {
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
            logger.error(
                "Received unserializeable message from worker '{worker}': {error}",
                {
                    worker: this.workerPath,
                },
            );
            event.preventDefault();
        };

        this.#worker.onerror = (event) => {
            logger.error(
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
        connectServiceToBus(this);
    }

    onMessage(callback: OnMessageHandler) {
        this.#worker?.addEventListener("message", (event) => {
            callback(JSON.parse(event.data));
        });
    }
}
