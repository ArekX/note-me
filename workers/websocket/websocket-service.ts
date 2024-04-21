import { resolveCookies } from "$backend/session/cookie.ts";
import { loadSessionState } from "$backend/session/session.ts";
import { AppSessionData } from "$types";
import { workerLogger } from "$backend/logger.ts";
import {
    ClientEvent,
    ClientEventFn,
    ErrorMessage,
    ListenerFn,
    ListenerKind,
    Message,
    NamespaceMap,
    RegisterKindMap,
    RegisterListenerMap,
    SocketClient,
    SocketClientMap,
} from "./types.ts";

const clients: SocketClientMap = {};

const handleConnectionRequest = async (request: Request): Promise<Response> => {
    if (request.headers.get("upgrade") != "websocket") {
        return new Response(null, { status: 501 });
    }

    const cookies = resolveCookies(request);
    const session = await loadSessionState<AppSessionData>(cookies.session);

    if (!session?.data?.user) {
        return new Response(null, { status: 401 });
    }

    const { socket, response } = Deno.upgradeWebSocket(request);

    const id = crypto.randomUUID();
    const userId = session.data.user.id;

    socket.addEventListener("open", () => {
        const client: SocketClient = {
            id,
            socket,
            userId,
            send: <T>(data: T) => socket.send(JSON.stringify(data)),
        };
        clients[id] = client;

        handleClientConnected(client);
    });

    socket.addEventListener("close", () => {
        handleClientDisconnected(clients[id]!);
        delete clients[id];
    });

    socket.addEventListener("message", (event) => {
        handleClientRequest(clients[id]!, JSON.parse(event.data));
    });

    return response;
};

const startServer = (hostname: string, port: number) => {
    Deno.serve({
        port,
        hostname,
        handler: handleConnectionRequest,
        onListen({ port }) {
            workerLogger.info(
                `WebSocket service started and running at {hostname}:{port}`,
                { hostname, port },
            );
        },
    });
};

const clientEvents: Record<ClientEvent, ClientEventFn[]> = {
    connected: [],
    disconnected: [],
};

const backendListeners: NamespaceMap = {};
const frontendListeners: NamespaceMap = {};

const handleBackendRequest = (message: Message) => {
    const { namespace, type } = message;
    const listeners = backendListeners[namespace]?.[type] ?? [];

    let wasRequestHandled = false;

    for (const listener of listeners) {
        listener({ message, service: websocketService, respond: () => {} });
        wasRequestHandled = true;
    }

    if (!wasRequestHandled) {
        workerLogger.error(
            `No handler for backend message of type '{type}' in namespace '{namespace}' was found.`,
            { type, namespace },
        );
    }
};

const handleClientConnected = (client: SocketClient) => {
    for (const listener of clientEvents.connected) {
        listener("connected", client);
    }
};

const handleClientDisconnected = (client: SocketClient) => {
    for (const listener of clientEvents.disconnected) {
        listener("disconnected", client);
    }
};

const handleClientRequest = (client: SocketClient, message: Message) => {
    const { namespace, type } = message;
    const listeners = frontendListeners[namespace]?.[type] ?? [];

    let wasRequestHandled = false;

    for (const listener of listeners) {
        listener({
            message,
            service: websocketService,
            sourceClient: client,
            respond: (responseMessage) => {
                client.send({
                    requestId: message.requestId,
                    namespace,
                    ...responseMessage,
                });
            },
        });
        wasRequestHandled = true;
    }

    if (!wasRequestHandled) {
        workerLogger.debug(
            `No handler for frontend message of type '{type}' in namespace '{namespace}' was found.`,
            { type, namespace },
        );
        client.send<ErrorMessage>({
            requestId: message.requestId,
            namespace: "system",
            type: "error",
            message:
                `No handler for message of type '${type}' in namespace '${namespace}' was found.`,
        });
    }
};

const registerClientEvent = (event: ClientEvent, listener: ClientEventFn) => {
    clientEvents[event].push(listener);
};

interface RegisterDefinition<T extends Message> {
    kind: ListenerKind;
    type: T["type"];
    namespace: T["namespace"];
    listener: ListenerFn<T>;
}

const register = <T extends Message>({
    kind,
    type,
    namespace,
    listener,
}: RegisterDefinition<T>) => {
    const listeners = kind === "backend" ? backendListeners : frontendListeners;

    if (!listeners[namespace]) {
        listeners[namespace] = {};
    }

    if (!listeners[namespace][type]) {
        listeners[namespace][type] = [];
    }

    listeners[namespace][type].push(listener as ListenerFn<unknown>);
};

const registerMap = <T extends Message>(
    kind: ListenerKind,
    namespace: T["namespace"],
    map: RegisterListenerMap<T>,
) => {
    for (
        const [type, listener] of Object.entries(map) as [
            keyof T,
            ListenerFn<T>,
        ][]
    ) {
        register({ kind, namespace, type: type as T["type"], listener });
    }
};

const registerKindMap = <Backend extends Message, Frontend extends Message>(
    namespace: Backend["namespace"] & Frontend["namespace"],
    map: RegisterKindMap<Backend, Frontend>,
) => {
    map.backend && registerMap("backend", namespace, map.backend);
    map.frontend && registerMap("frontend", namespace, map.frontend);
};

const getClient = (id: string): SocketClient | null => clients[id] ?? null;

const getClientByUserId = (userId: number): SocketClient | null => {
    for (const client of Object.values(clients)) {
        if (client.userId === userId) {
            return client;
        }
    }

    return null;
};

export type WebsocketService = typeof websocketService;

export const websocketService = {
    startServer,
    getClient,
    getClientByUserId,
    register,
    registerMap,
    registerKindMap,
    registerClientEvent,
    handleBackendRequest,
};
