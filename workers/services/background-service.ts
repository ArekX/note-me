import { logger } from "$backend/logger.ts";
import { hostWaitForWokerReady } from "$workers/services/worker-helper.ts";

interface BackgroundServiceOptions {
    required: boolean;
    dependencies?: string[];
}

export type OnMessageHandler<T = unknown> = (message: T) => void;

export class BackgroundService {
    #worker: Worker | null = null;
    #started: boolean = false;
    #retriesLeft: number = +(Deno.env.get("ALLOWED_SERVICE_RETRIES") || 3);

    constructor(
        public readonly name: string,
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
        this.#worker = null;
        this.#started = false;
    }

    async start() {
        if (this.#worker) {
            return;
        }

        this.#worker = new Worker(
            new URL(
                `../${this.name}/worker.ts`,
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
                    worker: this.name,
                },
            );
            event.preventDefault();
        };

        this.#worker.onerror = async (event) => {
            logger.error(
                "Restarting worker '{worker}' due to error '{error}' at {file}:{line}.",
                {
                    worker: this.name,
                    error: event.message,
                    file: event.filename,
                    line: event.lineno,
                },
            );

            if (this.#retriesLeft > 0) {
                this.stop();
                await this.start();
                event.preventDefault();
                this.#retriesLeft--;
            }
        };

        await hostWaitForWokerReady(this.#worker);

        this.#started = true;
    }

    onMessage(callback: OnMessageHandler) {
        const listener = (event: MessageEvent) => {
            callback(JSON.parse(event.data));
        };

        this.#worker?.addEventListener("message", listener);
        return listener;
    }

    removeMessageListener(callback: OnMessageHandler) {
        this.#worker?.removeEventListener("message", callback);
    }
}
