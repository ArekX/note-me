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
    requestId: string;
    type: Type;
    namespace: Namespace;
} & Data;

export type ErrorMessage = Message<"system", "error", { message: string }>;

export type OperationResponseMessage<Namespace = string, Type = string> =
    Message<
        Namespace,
        Type,
        { success: boolean }
    >;

export type ListenerKind = "backend" | "frontend";

export type ListenerFn<T = unknown> = (data: {
    message: T;
    service: WebsocketService;
    sourceClient?: SocketClient;
    respond: <R extends Message>(
        data: Omit<R, "namespace" | "requestId">,
    ) => void;
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
