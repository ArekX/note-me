export interface TimingHandler {
  triggerEveryMinutes: number;
  trigger: () => Promise<void>;
}

interface RegisteredTimingHandler {
  leftMinutes: number;
  handler: TimingHandler;
}

export class TimingService {
  #handlers: Set<RegisteredTimingHandler> = new Set();

  constructor(
    private readonly triggerTimeout: number = 10 * 1000,
  ) {}

  registerHandler(handler: TimingHandler) {
    this.#handlers.add({
      leftMinutes: handler.triggerEveryMinutes,
      handler,
    });
  }

  async *#triggerNextPeriod() {
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, this.triggerTimeout));
      yield;
    }
  }

  async start() {
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
