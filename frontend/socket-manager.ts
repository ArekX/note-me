import {
    consumePropagationTicket,
    createPropagationTicket,
    runCriticalJob,
    TicketId,
} from "$frontend/propagation-manager.ts";

type SocketHandler = (message: unknown) => void;

let socket: WebSocket | null = null;

let pendingRequestsPropagationTicket: TicketId | null = null;
let pendingRequests: (string | ArrayBuffer)[] = [];

const handlers: Set<SocketHandler> = new Set();

export const connect = (host: string): Promise<void> => {
    return new Promise((resolve) => {
        if (socket) {
            return;
        }

        socket = new WebSocket(host);
        socket.onmessage = (event) => processHandlers(event.data);
        socket.onclose = (event) => {
            socket = null;

            if (!event.wasClean) {
                // TODO: Add some notification that connection was lost.
                // TODO: Add connection retry logic and attempt to reconnect.
                setTimeout(() => connect(host), 1000);
            }
        };
        socket.onopen = async () => {
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
