import { BusEvents } from "$backend/event-bus/bus-events.ts";

export interface TimingHandler {
    triggerEveryMinutes: number;
    trigger: () => Promise<void>;
    onRegister(service: TimingService): void;
}

interface RegisteredTimingHandler {
    leftMinutes: number;
    handler: TimingHandler;
}

export class TimingService {
    #handlers: Set<RegisteredTimingHandler> = new Set();

    constructor(
        private readonly triggerTimeout: number = 60 * 1000,
        private readonly worker: DedicatedWorkerGlobalScope,
    ) {}

    registerHandler(handler: TimingHandler) {
        this.#handlers.add({
            leftMinutes: handler.triggerEveryMinutes,
            handler,
        });
        handler.onRegister(this);
    }

    async *#triggerNextPeriod() {
        while (true) {
            await new Promise((resolve) =>
                setTimeout(resolve, this.triggerTimeout)
            );
            yield;
        }
    }

    sendMessage(message: BusEvents) {
        this.worker.postMessage(JSON.stringify(message));
    }

    async start() {
        console.log("Timing worker started.");
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
