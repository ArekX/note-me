import { resolveCookies } from "$backend/session/cookie.ts";
import { loadSessionState } from "$backend/session/session.ts";
import { AppSessionData } from "$types";
import { workerLogger } from "$backend/logger.ts";
import {
    ClientEvent,
    ClientEventFn,
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

let abortController: AbortController;

const startServer = (hostname: string, port: number) => {
    abortController = new AbortController();
    Deno.serve({
        port,
        hostname,
        handler: handleConnectionRequest,
        signal: abortController.signal,
        onListen({ port }) {
            workerLogger.info(
                `WebSocket service started and running at {hostname}:{port}`,
                { hostname, port },
            );
        },
    });
};

const stopServer = () => abortController.abort();

const clientEvents: Record<ClientEvent, ClientEventFn[]> = {
    connected: [],
    disconnected: [],
};

const backendListeners: NamespaceMap = {};
const frontendListeners: NamespaceMap = {};

const handleBackendRequest = (message: Message) => {
    const { namespace, type } = message;
    const listeners = backendListeners[namespace]?.[type] ?? [];

    for (const listener of listeners) {
        listener({ message, service: websocketService, respond: () => {} });
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

    for (const listener of listeners) {
        listener({
            message,
            service: websocketService,
            sourceClient: client,
            respond: (message) => {
                client.send({
                    namespace,
                    ...message,
                });
            },
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
    start: startServer,
    stop: stopServer,
    getClient,
    getClientByUserId,
    register,
    registerMap,
    registerKindMap,
    registerClientEvent,
    onBackendRequest: handleBackendRequest,
};
