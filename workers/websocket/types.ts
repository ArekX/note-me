export interface SocketClient {
    id: string;
    userId: number;
    socket: WebSocket;
    send<T>(data: T): void;
}

export interface WebSocketHandler<
    FrontendMessage = unknown,
    BackendMessage = unknown,
> {
    onConnected?(client: SocketClient): void;
    onDisconnected?(client: SocketClient): void;
    onBackendMessage?(data: BackendMessage): Promise<void>;
    onFrontendMessage?(client: SocketClient, data: FrontendMessage): void;
}

export type SocketClientMap = { [key: SocketClient["id"]]: SocketClient };
