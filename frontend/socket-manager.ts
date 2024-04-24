import {
    consumePropagationTicket,
    createPropagationTicket,
    runCriticalJob,
    TicketId,
} from "$frontend/propagation-manager.ts";

type SocketHandler = (message: unknown) => void;

let socket: WebSocket | null = null;

let pendingRequestsPropagationTicket: TicketId | null = null;
let pendingRequests: string[] = [];

const handlers: Set<SocketHandler> = new Set();

export const connect = (host: string): Promise<void> => {
    return new Promise((resolve) => {
        if (socket) {
            return;
        }

        socket = new WebSocket(host);
        socket.onmessage = (event) => processHandlers(event.data);
        socket.onclose = () => socket = null;
        socket.onopen = () => {
            for (const request of pendingRequests) {
                socket?.send(request);
            }
            pendingRequests = [];
            consumePropagationTicket(pendingRequestsPropagationTicket!);
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
    });
};

export const send = <T>(message: T) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        pendingRequests.push(JSON.stringify(message));
        if (!pendingRequestsPropagationTicket) {
            pendingRequestsPropagationTicket = createPropagationTicket();
        }
        return;
    }

    socket?.send(JSON.stringify(message));
};

export const addListener = <T>(handler: (message: T) => void) => {
    handlers.add(handler as SocketHandler);
};

export const removeListener = <T>(handler: (message: T) => void) => {
    handlers.delete(handler as SocketHandler);
};
