type SocketHandler = (message: unknown) => void;

class SocketManager {
    #socket: WebSocket | null = null;
    #handlers: Set<SocketHandler> = new Set();
    #pendingRequests: string[] = [];

    connect(socketHost: string): Promise<void> {
        return new Promise((resolve) => {
            if (this.#socket) {
                return;
            }

            this.#socket = new WebSocket(socketHost);
            this.#socket.onmessage = (event) =>
                this.#processHandlers(event.data);
            this.#socket.onclose = () => this.#socket = null;
            this.#socket.onopen = () => {
                for (const request of this.#pendingRequests) {
                    this.#socket?.send(request);
                }
                this.#pendingRequests = [];
                resolve();
            };
        });
    }

    send<T>(message: T) {
        if (!this.#socket || this.#socket.readyState !== WebSocket.OPEN) {
            this.#pendingRequests.push(JSON.stringify(message));
            return;
        }

        this.#socket?.send(JSON.stringify(message));
    }

    addListener<T>(handler: (message: T) => void) {
        this.#handlers.add(handler as SocketHandler);
    }

    removeListener<T>(handler: (message: T) => void) {
        this.#handlers.delete(handler as SocketHandler);
    }

    #processHandlers(message: string) {
        const data = JSON.parse(message);
        for (const handler of this.#handlers) {
            handler(data);
        }
    }
}

export const socketManager = new SocketManager();
