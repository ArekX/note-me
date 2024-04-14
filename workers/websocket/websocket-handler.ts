import { SocketClient, WebSocketHandler } from "./types.ts";

type SocketUserClientMap = { [key: SocketClient["userId"]]: SocketClient };

export abstract class BaseWebSocketHandler<
    Frontend,
    Backend extends { type: string },
> implements WebSocketHandler<Frontend, Backend> {
    #clients: SocketUserClientMap = {};

    onConnected(client: SocketClient) {
        this.#clients[client.userId] = client;
    }

    onDisconnected(client: SocketClient) {
        delete this.#clients[client.userId];
    }

    getClient(userId: number): SocketClient | null {
        return this.#clients[userId] ?? null;
    }

    getAllClients(): SocketClient[] {
        return Object.values(this.#clients);
    }

    abstract getAllowedBackendMessages(): Backend["type"][];

    abstract onBackendScopedMessage(data: Backend): Promise<void>;

    onBackendMessage(data: Backend): Promise<void> {
        if (!this.getAllowedBackendMessages().includes(data.type)) {
            return Promise.resolve();
        }

        return this.onBackendScopedMessage(data);
    }
}
