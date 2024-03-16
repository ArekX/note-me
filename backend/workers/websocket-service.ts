import { resolveCookies } from "$backend/session/cookie.ts";
import { loadSessionState } from "$backend/session/session.ts";
import { AppSessionData } from "$types";
import { WebSocketMessage } from "./webworkers/websocket-worker.ts";

export interface WebSocketHandler<
    ClientMessages = unknown,
> {
    onRegister?(service: WebSocketService): void;
    onOpen?(client: WebSocketClient): void;
    onClose?(client: WebSocketClient): void;
    onWorkerRequest?(data: WebSocketMessage): Promise<void>;
    onClientMessage?(client: WebSocketClient, data: ClientMessages): void;
}

export type WebSocketClientList = { [key: string]: WebSocketClient };

export interface WebSocketClient {
    clientId: string;
    userId: number;
    socket: WebSocket;
    send<T>(data: T): void;
}

export class WebSocketService {
    #handler: Set<WebSocketHandler> = new Set();
    #clients: WebSocketClientList = {};
    #abortController = new AbortController();

    constructor(
        private readonly port: number = 8080,
        private readonly hostname: string = "0.0.0.0",
    ) {}

    registerHandler(handler: WebSocketHandler) {
        this.#handler.add(handler);
        handler.onRegister?.(this);
    }

    getClient(clientId: string): WebSocketClient | null {
        return this.#clients[clientId] ?? null;
    }

    async #handleRequest(request: Request): Promise<Response> {
        if (request.headers.get("upgrade") != "websocket") {
            return new Response(null, { status: 501 });
        }

        const cookies = resolveCookies(request);
        const session = await loadSessionState<AppSessionData>(cookies.session);

        if (!session?.data?.user) {
            return new Response(null, { status: 401 });
        }

        const { socket, response } = Deno.upgradeWebSocket(request);

        const clientId = crypto.randomUUID();
        const userId = session.data.user.id;

        socket.addEventListener("open", () => {
            const client = {
                clientId,
                socket,
                userId,
                send: <T>(data: T) => {
                    socket.send(JSON.stringify(data));
                },
            };
            this.#clients[clientId] = client;

            for (const handler of this.#handler) {
                handler.onOpen?.(client);
            }
        });

        socket.addEventListener("close", () => {
            const client = this.getClient(clientId)!;

            for (const handler of this.#handler) {
                handler.onClose?.(client);
            }

            delete this.#clients[clientId];
        });

        socket.addEventListener("message", (event) => {
            const client = this.getClient(clientId)!;
            for (const handler of this.#handler) {
                handler.onClientMessage?.(client, JSON.parse(event.data));
            }
        });

        return response;
    }

    sendTo<T>(clientId: string, data: T): boolean {
        const client = this.getClient(clientId);
        if (!client) {
            return false;
        }

        client.socket.send(JSON.stringify(data));

        return true;
    }

    broadcast<T>(data: T): void {
        for (const client of Object.values(this.#clients)) {
            client.socket.send(JSON.stringify(data));
        }
    }

    async handleWorkerMessage(data: WebSocketMessage): Promise<void> {
        for (const handler of this.#handler) {
            await handler.onWorkerRequest?.(data);
        }
    }

    stop() {
        this.#abortController.abort();
    }

    start() {
        Deno.serve({
            port: this.port,
            hostname: this.hostname,
            handler: (request) => this.#handleRequest(request),
            signal: this.#abortController.signal,
            onListen({ port, hostname }) {
                console.log(
                    `WebSocket Worker started at http://${hostname}:${port}`,
                );
            },
        });
    }
}
