import { WebsocketService } from "$workers/websocket/websocket-service.ts";
import { Roles } from "$backend/rbac/role-definitions.ts";
import { AppPermissions } from "$backend/rbac/permissions.ts";

export interface SocketClient {
    id: string;
    userId: number;
    username: string;
    socket: WebSocket;
    send<T>(data: T): void;
    role: Roles;
    auth: {
        require: (permission: AppPermissions) => void;
        can: (permission: AppPermissions) => boolean;
    };
}

export type SocketClientMap = { [key: SocketClient["id"]]: SocketClient };

export type ClientEvent = "connected" | "disconnected";
export type ClientEventFn = (event: ClientEvent, client: SocketClient) => void;

export type MessageHeader<Namespace = string, Type = string> = {
    requestId: string;
    type: Type;
    namespace: Namespace;
};

export type Message<Namespace = string, Type = string, Data = unknown> =
    & MessageHeader<Namespace, Type>
    & Data;

export type BinaryMessage<Namespace = string, Type = string, Data = unknown> =
    & MessageHeader<Namespace, Type>
    & Data
    & {
        binaryData: ArrayBuffer;
    };

export type SocketMessage = BinaryMessage | Message;

export type ErrorMessage = Message<"system", "error", { message: string }>;

export type OperationResponseMessage<Namespace = string, Type = string> =
    Message<
        Namespace,
        Type,
        { success: boolean }
    >;

export type ListenerKind = "backend" | "frontend";

type SocketSendData<R extends SocketMessage> =
    & Omit<R, "namespace" | "requestId">
    & Partial<Pick<R, "requestId" | "namespace">>;

export type ListenerFn<T = unknown> = (data: {
    message: T;
    service: WebsocketService;
    sourceClient?: SocketClient;
    send: <R extends SocketMessage>(
        data: SocketSendData<R>,
    ) => void;
    respond: <R extends SocketMessage>(
        data: SocketSendData<R>,
    ) => void;
}) => void;

export type NamespaceMap = { [key: string]: ListenerMap };

export type ListenerMap = { [key: string]: ListenerFn[] };

export type RegisterListenerMap<T extends Message> = {
    [K in T["type"]]?: ListenerFn<Extract<T, { type: K }>>;
};

export type RegisterKindMap<
    BackendMessages extends SocketMessage,
    FrontendMessages extends SocketMessage,
> = {
    backend?: RegisterListenerMap<BackendMessages>;
    frontend?: RegisterListenerMap<FrontendMessages>;
};

export type RegisterFrontendKindMap<T extends SocketMessage> = Required<
    Pick<RegisterKindMap<T, T>, "frontend">
>;
export type RegisterBackendKindMap<T extends SocketMessage> = Required<
    Pick<RegisterKindMap<T, T>, "backend">
>;
