import { BusEvents } from "$backend/event-bus/bus-events.ts";
import { workerLogger } from "$backend/logger.ts";

export interface TimerHandler {
    triggerEveryMinutes: number;
    trigger: () => Promise<void>;
    onRegister(service: TimerService): void;
}

interface RegisteredTimingHandler {
    leftMinutes: number;
    handler: TimerHandler;
}

export const EVERY_MINUTE = 60 * 1000;

export class TimerService {
    #handlers: Set<RegisteredTimingHandler> = new Set();

    constructor(
        private readonly worker: DedicatedWorkerGlobalScope,
        private readonly runEvery: number = EVERY_MINUTE,
    ) {}

    registerHandler(handler: TimerHandler) {
        this.#handlers.add({
            leftMinutes: handler.triggerEveryMinutes,
            handler,
        });
        handler.onRegister(this);
    }

    async *#triggerNextPeriod() {
        while (true) {
            await new Promise((resolve) => setTimeout(resolve, this.runEvery));
            yield;
        }
    }

    sendMessage(message: BusEvents) {
        this.worker.postMessage(JSON.stringify(message));
    }

    async start() {
        workerLogger.info("Periodic timing service started.");
        for await (const _ of this.#triggerNextPeriod()) {
            for (const handler of this.#handlers) {
                handler.leftMinutes--;
                if (handler.leftMinutes <= 0) {
                    await handler.handler.trigger();
                    handler.leftMinutes = handler.handler.triggerEveryMinutes;
                }
            }
        }
    }
}
