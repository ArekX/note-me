import {
    consumePropagationTicket,
    createPropagationTicket,
    runCriticalJob,
    TicketId,
} from "$frontend/propagation-manager.ts";
import { addMessage } from "$frontend/toast-message.ts";

type SocketHandler = (message: unknown) => void;

let socket: WebSocket | null = null;

let pendingRequestsPropagationTicket: TicketId | null = null;
let pendingRequests: (string | ArrayBuffer)[] = [];

const handlers: Set<SocketHandler> = new Set();
let isReconnecting = false;
let connectionRetries = 0;

export const connect = (host: string): Promise<void> => {
    return new Promise((resolve) => {
        if (socket) {
            return;
        }

        socket = new WebSocket(host);
        socket.onmessage = (event) => processHandlers(event.data);
        socket.onclose = (event) => {
            socket = null;

            if (event.wasClean) {
                return;
            }

            if (!isReconnecting) {
                addMessage({
                    type: "warning",
                    text:
                        "Connection to the server was lost. Attempting to reconnect...",
                });
            }

            isReconnecting = true;
            setTimeout(() => connect(host), 1000);
        };
        socket.onerror = () => {
            if (isReconnecting && connectionRetries < 5) {
                connectionRetries++;
                setTimeout(() => connect(host), 1000);
                return;
            }

            addMessage({
                type: "error",
                text: "Connection to the server failed after 5 attempts.",
            });
        };
        socket.onopen = async () => {
            if (isReconnecting) {
                addMessage({
                    type: "success",
                    text: "Connection to the server was restored.",
                });
                isReconnecting = false;
                connectionRetries = 0;
            }

            for (const request of pendingRequests) {
                socket?.send(request);
            }
            pendingRequests = [];
            await consumePropagationTicket(pendingRequestsPropagationTicket!);
            resolve();
        };
    });
};

const processHandlers = (message: string) => {
    runCriticalJob(() => {
        const data = JSON.parse(message);
        for (const handler of handlers) {
            handler(data);
        }

        return Promise.resolve();
    });
};

const pushToPendingRequests = (message: string | ArrayBuffer) => {
    pendingRequests.push(message);
    if (!pendingRequestsPropagationTicket) {
        pendingRequestsPropagationTicket = createPropagationTicket();
    }
};

export const send = <T>(message: T) => {
    const jsonMessage = JSON.stringify(message);
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        pushToPendingRequests(jsonMessage);
        return;
    }

    socket?.send(jsonMessage);
};

export const sendBinary = (data: ArrayBuffer) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        pushToPendingRequests(data);
        return;
    }

    socket?.send(data);
};

export const addListener = <T>(handler: (message: T) => void) => {
    handlers.add(handler as SocketHandler);
};

export const removeListener = <T>(handler: (message: T) => void) => {
    handlers.delete(handler as SocketHandler);
};
