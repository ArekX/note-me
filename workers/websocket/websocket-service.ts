import { resolveCookies } from "$backend/session/cookie.ts";
import { loadSessionState } from "$backend/session/session.ts";
import { AppSessionData } from "$types";
import { workerLogger } from "$backend/logger.ts";
import { SocketBackendMessage } from "./messages.ts";
import { SocketClient, SocketClientMap, WebSocketHandler } from "./types.ts";

export class WebSocketService {
    #handler: Set<WebSocketHandler> = new Set();
    #clients: SocketClientMap = {};
    #abortController = new AbortController();

    constructor(
        private readonly port: number = 8080,
        private readonly hostname: string = "0.0.0.0",
    ) {}

    registerHandler(handler: WebSocketHandler) {
        this.#handler.add(handler);
    }

    getClient(clientId: string): SocketClient | null {
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

        const id = crypto.randomUUID();
        const userId = session.data.user.id;

        socket.addEventListener("open", () => {
            const client: SocketClient = {
                id,
                socket,
                userId,
                send: <T>(data: T) => {
                    socket.send(JSON.stringify(data));
                },
            };
            this.#clients[id] = client;

            for (const handler of this.#handler) {
                handler.onConnected?.(client);
            }
        });

        socket.addEventListener("close", () => {
            const client = this.getClient(id)!;

            for (const handler of this.#handler) {
                handler.onDisconnected?.(client);
            }

            delete this.#clients[id];
        });

        socket.addEventListener("message", (event) => {
            const client = this.getClient(id)!;
            for (const handler of this.#handler) {
                handler.onFrontendMessage?.(client, JSON.parse(event.data));
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

    async handleBackendMessage(data: SocketBackendMessage): Promise<void> {
        for (const handler of this.#handler) {
            await handler.onBackendMessage?.(data);
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
                workerLogger.info(
                    `WebSocket service started and running at {hostname}:{port}`,
                    { hostname, port },
                );
            },
        });
    }
}
