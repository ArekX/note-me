import type { OutgoingFrame, SocketTransport } from "@/lib/socket/transport";
import { createMockTransport } from "./transport";

export * from "./state";
export * from "./transport";
export { MOCK_PASSWORD, mockSessionPayload } from "./handlers/users";
export { mockPublicNote } from "./public-note";

const mock = createMockTransport();

export const mockControl = mock.control;

// Stands in for the browser WebSocket so the app's own transport talks to
// the mock backend (installed in src/test/setup.ts).
export class MockWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;

    binaryType = "blob";
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: string | ArrayBuffer }) => void) | null = null;
    onclose: (() => void) | null = null;
    onerror: (() => void) | null = null;

    private readonly socket: SocketTransport;

    constructor(url: string | URL) {
        this.socket = mock.transport(new URL(url), {
            onOpen: () => this.onopen?.(),
            onMessage: (data) => this.onmessage?.({ data }),
            onClose: () => this.onclose?.(),
            onError: () => this.onerror?.(),
        });
    }

    get readyState() {
        return this.socket.isOpen ? MockWebSocket.OPEN : MockWebSocket.CLOSED;
    }

    send(frame: OutgoingFrame) {
        this.socket.send(frame);
    }

    close() {
        this.socket.close();
    }
}
