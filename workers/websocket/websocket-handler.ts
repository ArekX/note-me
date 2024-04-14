import { SocketClient, WebSocketHandler } from "./types.ts";

type SocketUserClientMap = { [key: SocketClient["userId"]]: SocketClient };

export class BaseWebSocketHandler<Frontend, Backend>
    implements WebSocketHandler<Frontend, Backend> {
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
}
