type SocketHandler = (message: unknown) => void;

class SocketManager {
  #socket: WebSocket | null = null;
  #handlers: Set<SocketHandler> = new Set();

  connect(socketHost: string): Promise<void> {
    return new Promise((resolve) => {
      if (this.#socket) {
        return;
      }

      this.#socket = new WebSocket(socketHost);
      this.#socket.onmessage = (event) => this.#processHandlers(event.data);
      this.#socket.onclose = () => this.#socket = null;
      this.#socket.onopen = () => resolve();
    });
  }

  send<T>(message: T) {
    this.#socket?.send(JSON.stringify(message));
  }

  onMessage<T>(handler: (message: T) => void) {
    this.#handlers.add(handler as SocketHandler);
  }

  #processHandlers(message: string) {
    const data = JSON.parse(message);
    for (const handler of this.#handlers) {
      handler(data);
    }
  }
}

export const socketManager = new SocketManager();