export type OutgoingFrame = string | Uint8Array<ArrayBuffer>;

export interface TransportHandlers {
    onOpen: () => void;
    onMessage: (data: string | ArrayBuffer) => void;
    onClose: () => void;
    onError: () => void;
}

export interface SocketTransport {
    readonly isOpen: boolean;
    send(frame: OutgoingFrame): void;
    close(): void;
}

export type TransportFactory = (
    url: URL,
    handlers: TransportHandlers,
) => SocketTransport;

export const browserTransport: TransportFactory = (url, handlers) => {
    const socket = new WebSocket(url);
    socket.binaryType = "arraybuffer";
    socket.onopen = handlers.onOpen;
    socket.onmessage = (event) => handlers.onMessage(event.data);
    socket.onclose = handlers.onClose;
    socket.onerror = handlers.onError;

    return {
        get isOpen() {
            return socket.readyState === WebSocket.OPEN;
        },
        send: (frame) => socket.send(frame),
        close: () => socket.close(),
    };
};
