import { WebsocketService } from "$workers/websocket/websocket-service.ts";

export interface SocketClient {
    id: string;
    userId: number;
    socket: WebSocket;
    send<T>(data: T): void;
}

export type SocketClientMap = { [key: SocketClient["id"]]: SocketClient };

export type ClientEvent = "connected" | "disconnected";
export type ClientEventFn = (event: ClientEvent, client: SocketClient) => void;

export type Message<Namespace = string, Type = string, Data = unknown> = {
    type: Type;
    namespace: Namespace;
} & Data;

export type ListenerKind = "backend" | "frontend";

export type ListenerFn<T = unknown> = (data: {
    message: T;
    service: WebsocketService;
    sourceClient?: SocketClient;
    respond: <R extends Message>(data: Omit<R, "namespace">) => void;
}) => void;

export type NamespaceMap = { [key: string]: ListenerMap };

export type ListenerMap = { [key: string]: ListenerFn[] };

export type RegisterListenerMap<T extends Message> = {
    [K in T["type"]]?: ListenerFn<Extract<T, { type: K }>>;
};

export type RegisterKindMap<
    BackendMessages extends Message,
    FrontendMessages extends Message,
> = {
    backend?: RegisterListenerMap<BackendMessages>;
    frontend?: RegisterListenerMap<FrontendMessages>;
};

export type RegisterFrontendKindMap<T extends Message> = Required<
    Pick<RegisterKindMap<T, T>, "frontend">
>;
export type RegisterBackendKindMap<T extends Message> = Required<
    Pick<RegisterKindMap<T, T>, "backend">
>;
