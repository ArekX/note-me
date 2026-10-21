import { decodeBinaryMessage } from "./binary";
import {
    browserTransport,
    type OutgoingFrame,
    type SocketTransport,
    type TransportFactory,
} from "./transport";

export type SocketStatus =
    "disconnected" | "connecting" | "connected" | "reconnecting" | "failed";

export interface SocketStatusEvent {
    status: SocketStatus;
    attempt?: number;
    restored?: boolean;
}

export type MessageHandler = (message: unknown) => void;
export type StatusHandler = (event: SocketStatusEvent) => void;

export interface SocketManagerOptions {
    transport?: TransportFactory;
    maxRetries?: number;
    reconnectDelayMs?: number;
    heartbeatIntervalMs?: number;
}

export const MAX_RETRIES = 5;
export const MAX_RECONNECT_DELAY_MS = 30_000;
export const MAX_PENDING_FRAMES = 100;
// A connection dropped this soon after opening counts as a failed attempt.
const FLAP_WINDOW_MS = 5_000;

interface PendingConnect {
    resolve: () => void;
    reject: (error: Error) => void;
}

export class SocketManager {
    private readonly createTransport: TransportFactory;
    private readonly maxRetries: number;
    private readonly reconnectDelayMs: number;
    private readonly heartbeatIntervalMs: number;

    private transport: SocketTransport | null = null;
    private host: URL | null = null;
    private pending: OutgoingFrame[] = [];
    private waiting: PendingConnect[] = [];
    private readonly listeners = new Set<MessageHandler>();
    private readonly statusListeners = new Set<StatusHandler>();
    private isReconnecting = false;
    private retries = 0;
    private openedAt = 0;
    private heartbeat: ReturnType<typeof setInterval> | null = null;
    private closedByUser = false;
    private droppedFrames = false;

    constructor(options: SocketManagerOptions = {}) {
        this.createTransport = options.transport ?? browserTransport;
        this.maxRetries = options.maxRetries ?? MAX_RETRIES;
        this.reconnectDelayMs = options.reconnectDelayMs ?? 1000;
        this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 1000;
    }

    get isOpen(): boolean {
        return this.transport?.isOpen === true && !this.isReconnecting;
    }

    connect(host: URL): Promise<void> {
        this.host = host;
        this.closedByUser = false;
        if (this.isOpen) {
            return Promise.resolve();
        }
        const connected = new Promise<void>((resolve, reject) =>
            this.waiting.push({ resolve, reject }),
        );
        this.open();
        return connected;
    }

    disconnect(): void {
        this.closedByUser = true;
        this.stopHeartbeat();
        this.dropTransport();
        this.isReconnecting = false;
        this.retries = 0;
        this.pending = [];
        this.settle(new Error("Disconnected."));
        this.emitStatus({ status: "disconnected" });
    }

    send(frame: OutgoingFrame): void {
        if (this.isOpen) {
            this.transport!.send(frame);
            return;
        }
        this.pending.push(frame);
        if (this.pending.length > MAX_PENDING_FRAMES) {
            this.pending.shift();
            if (!this.droppedFrames) {
                this.droppedFrames = true;
                console.warn(
                    `Socket queue full, dropping oldest frames (limit ${MAX_PENDING_FRAMES}).`,
                );
            }
        }
    }

    addListener(handler: MessageHandler): () => void {
        this.listeners.add(handler);
        return () => this.listeners.delete(handler);
    }

    removeListener(handler: MessageHandler): void {
        this.listeners.delete(handler);
    }

    onStatus(handler: StatusHandler): () => void {
        this.statusListeners.add(handler);
        return () => this.statusListeners.delete(handler);
    }

    private open(): void {
        if (this.transport || !this.host || this.closedByUser) {
            return;
        }

        this.emitStatus({
            status: this.isReconnecting ? "reconnecting" : "connecting",
            attempt: this.isReconnecting ? this.retries : undefined,
        });

        // Events of a transport that was already replaced are ignored.
        const transport: SocketTransport = this.createTransport(this.host, {
            onOpen: () => {
                if (this.transport !== transport) {
                    return;
                }
                const restored = this.isReconnecting;
                this.isReconnecting = false;
                this.openedAt = Date.now();

                for (const frame of this.pending) {
                    transport.send(frame);
                }
                this.pending = [];
                this.droppedFrames = false;

                this.startHeartbeat();
                this.emitStatus({ status: "connected", restored });
                this.settle();
            },
            onMessage: (data) => {
                if (this.transport === transport) {
                    this.dispatch(data);
                }
            },
            onClose: () => {
                if (this.transport !== transport) {
                    return;
                }
                this.transport = null;
                this.stopHeartbeat();
                if (!this.closedByUser) {
                    this.connectionDropped();
                }
            },
            // A browser socket always closes after an error.
            onError: () => {},
        });
        this.transport = transport;
    }

    // A failed attempt or a connection that flapped counts toward the retry
    // limit; a connection that stayed up starts the count over. The first
    // reconnect is attempt 0, as in the original manager.
    private connectionDropped(): void {
        const wasOpen = this.openedAt !== 0;
        const stayedUp =
            wasOpen && Date.now() - this.openedAt >= FLAP_WINDOW_MS;
        this.openedAt = 0;
        if (stayedUp) {
            this.retries = 0;
        } else if (this.isReconnecting || wasOpen) {
            if (this.retries >= this.maxRetries) {
                this.fail();
                return;
            }
            this.retries++;
        }
        this.scheduleReconnect();
    }

    private scheduleReconnect(): void {
        this.isReconnecting = true;
        setTimeout(() => {
            if (!this.closedByUser) {
                this.dropTransport();
                this.open();
            }
        }, this.reconnectDelay());
    }

    private reconnectDelay(): number {
        const delay = Math.min(
            this.reconnectDelayMs * 2 ** this.retries,
            MAX_RECONNECT_DELAY_MS,
        );
        return Math.round(delay * (1 + Math.random() * 0.2));
    }

    private fail(): void {
        this.emitStatus({ status: "failed", attempt: this.retries });
        this.settle(
            new Error(`Connection failed after ${this.retries} attempts.`),
        );
    }

    private dropTransport(): void {
        const transport = this.transport;
        this.transport = null;
        transport?.close();
    }

    // Only notices closes the browser already knows about. Dead connections
    // are found by the server's pings, which browsers answer on their own.
    private startHeartbeat(): void {
        this.stopHeartbeat();
        this.heartbeat = setInterval(() => {
            if (this.transport?.isOpen) {
                return;
            }
            this.stopHeartbeat();
            this.dropTransport();
            this.connectionDropped();
        }, this.heartbeatIntervalMs);
    }

    private stopHeartbeat(): void {
        if (this.heartbeat !== null) {
            clearInterval(this.heartbeat);
            this.heartbeat = null;
        }
    }

    private settle(error?: Error): void {
        const waiting = this.waiting;
        this.waiting = [];
        for (const { resolve, reject } of waiting) {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        }
    }

    private dispatch(data: string | ArrayBuffer): void {
        let message: unknown;
        try {
            message =
                typeof data === "string"
                    ? JSON.parse(data)
                    : decodeBinaryMessage(data);
        } catch {
            return;
        }
        if (message === null || typeof message !== "object") {
            return;
        }
        for (const listener of this.listeners) {
            listener(message);
        }
    }

    private emitStatus(event: SocketStatusEvent): void {
        for (const listener of this.statusListeners) {
            listener(event);
        }
    }
}
