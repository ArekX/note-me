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
      new URL(`./services/${this.serviceName}.ts`, import.meta.url).href,
      {
        type: "module",
      },
    );
  }

  onMessage<T>(callback: (message: T) => void) {
    this.#worker?.addEventListener("message", (event) => {
      callback(JSON.parse(event.data));
    });
  }
}
