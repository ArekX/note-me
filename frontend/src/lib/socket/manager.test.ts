import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encodeBinaryMessage } from "./binary";
import {
    MAX_PENDING_FRAMES,
    MAX_RECONNECT_DELAY_MS,
    MAX_RETRIES,
    SocketManager,
} from "./manager";
import { createSocketService } from "./service";
import type { SocketTransport, TransportHandlers } from "./transport";

interface FakeSocket extends SocketTransport {
    sent: string[];
    handlers: TransportHandlers;
    open(): void;
    fail(): void;
}

const createFakeTransport = () => {
    const sockets: FakeSocket[] = [];
    const factory = (_url: URL, handlers: TransportHandlers) => {
        let isOpen = false;
        const socket: FakeSocket = {
            sent: [],
            handlers,
            get isOpen() {
                return isOpen;
            },
            open() {
                isOpen = true;
                handlers.onOpen();
            },
            fail() {
                isOpen = false;
                handlers.onError();
                handlers.onClose();
            },
            send: (frame) => socket.sent.push(String(frame)),
            close: () => {
                isOpen = false;
                handlers.onClose();
            },
        };
        sockets.push(socket);
        return socket;
    };
    return { factory, sockets };
};

describe("SocketManager", () => {
    it("queues frames until the transport opens", async () => {
        const { factory, sockets } = createFakeTransport();
        const manager = new SocketManager({
            transport: factory,
            heartbeatIntervalMs: 0,
        });

        const connected = manager.connect(new URL("ws://test"));
        manager.send("queued");
        expect(sockets[0]!.sent).toEqual([]);

        sockets[0]!.open();
        await connected;
        expect(sockets[0]!.sent).toEqual(["queued"]);

        manager.send("live");
        expect(sockets[0]!.sent).toEqual(["queued", "live"]);
        manager.disconnect();
    });

    it("reconnects after the transport closes and reports status", () => {
        vi.useFakeTimers();
        const { factory, sockets } = createFakeTransport();
        const manager = new SocketManager({
            transport: factory,
            reconnectDelayMs: 10,
            heartbeatIntervalMs: 0,
        });
        const statuses: string[] = [];
        manager.onStatus((e) =>
            statuses.push(e.status + (e.restored ? ":restored" : "")),
        );

        void manager.connect(new URL("ws://test"));
        sockets[0]!.open();
        sockets[0]!.close();
        vi.advanceTimersToNextTimer();
        sockets[1]!.open();

        expect(statuses).toEqual([
            "connecting",
            "connected",
            "reconnecting",
            "connected:restored",
        ]);
        manager.disconnect();
        vi.useRealTimers();
    });
});

describe("SocketManager reconnects", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(Math, "random").mockReturnValue(0);
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    const createManager = () => {
        const fake = createFakeTransport();
        const manager = new SocketManager({
            transport: fake.factory,
            reconnectDelayMs: 10,
            heartbeatIntervalMs: 1000,
        });
        return { manager, ...fake };
    };

    it("resolves connect() when a retry succeeds after the first attempt failed", async () => {
        const { manager, sockets } = createManager();
        const connected = manager.connect(new URL("ws://test"));

        sockets[0]!.fail();
        vi.advanceTimersByTime(10);
        sockets[1]!.open();

        await expect(connected).resolves.toBeUndefined();
        manager.disconnect();
    });

    it("reports failure and rejects connect() after the last retry, doubling the delay", async () => {
        const { manager, sockets } = createManager();
        const statuses: string[] = [];
        manager.onStatus((e) =>
            statuses.push(`${e.status}:${e.attempt ?? ""}`),
        );
        const connected = manager.connect(new URL("ws://test"));

        // The first reconnect is attempt 0, as in the original manager.
        for (let attempt = 0; attempt <= MAX_RETRIES + 1; attempt++) {
            sockets[attempt]!.fail();
            const delay = 10 * 2 ** attempt;
            vi.advanceTimersByTime(delay - 1);
            expect(sockets).toHaveLength(
                Math.min(attempt + 1, MAX_RETRIES + 2),
            );
            vi.advanceTimersByTime(1);
        }

        await expect(connected).rejects.toThrow(
            `Connection failed after ${MAX_RETRIES} attempts.`,
        );
        expect(sockets).toHaveLength(MAX_RETRIES + 2);
        expect(statuses.at(-1)).toBe(`failed:${MAX_RETRIES}`);
        expect(statuses).toContain("reconnecting:0");
        expect(statuses).toContain(`reconnecting:${MAX_RETRIES}`);
    });

    it("caps the delay and adds up to 20% jitter", () => {
        const { manager, sockets } = createManager();
        manager.connect(new URL("ws://test")).catch(() => {});
        for (let attempt = 0; attempt < 3; attempt++) {
            sockets[attempt]!.fail();
            vi.advanceTimersToNextTimer();
        }

        vi.mocked(Math.random).mockReturnValue(1);
        sockets[3]!.fail();
        vi.advanceTimersByTime(96 - 1);
        expect(sockets).toHaveLength(4);
        vi.advanceTimersByTime(1);
        expect(sockets).toHaveLength(5);

        const capped = new SocketManager({
            transport: createFakeTransport().factory,
            reconnectDelayMs: MAX_RECONNECT_DELAY_MS,
            heartbeatIntervalMs: 0,
        });
        const spy = vi.spyOn(globalThis, "setTimeout");
        capped.connect(new URL("ws://test")).catch(() => {});
        capped["connectionDropped"]();
        expect(spy).toHaveBeenLastCalledWith(
            expect.any(Function),
            MAX_RECONNECT_DELAY_MS * 1.2,
        );
        capped.disconnect();
        manager.disconnect();
    });

    it("counts a connection that drops right after opening as a failed attempt", async () => {
        const { manager, sockets } = createManager();
        const statuses: string[] = [];
        manager.onStatus((e) =>
            statuses.push(`${e.status}:${e.attempt ?? ""}`),
        );
        const connected = manager.connect(new URL("ws://test"));
        sockets[0]!.open();
        await connected;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            sockets[attempt]!.close();
            vi.advanceTimersToNextTimer();
            sockets[attempt + 1]!.open();
        }
        expect(statuses).toContain(`reconnecting:${MAX_RETRIES}`);
        expect(statuses).not.toContain("failed:" + MAX_RETRIES);

        sockets[MAX_RETRIES]!.close();
        expect(statuses.at(-1)).toBe(`failed:${MAX_RETRIES}`);
        expect(sockets).toHaveLength(MAX_RETRIES + 1);
    });

    it("starts the count over after a connection that stayed up", () => {
        const { manager, sockets } = createManager();
        const statuses: string[] = [];
        manager.onStatus((e) =>
            statuses.push(`${e.status}:${e.attempt ?? ""}`),
        );
        void manager.connect(new URL("ws://test"));
        sockets[0]!.fail();
        vi.advanceTimersToNextTimer();
        sockets[1]!.fail();
        vi.advanceTimersToNextTimer();
        sockets[2]!.open();
        vi.advanceTimersByTime(5_000);
        sockets[2]!.close();
        vi.advanceTimersToNextTimer();

        expect(statuses.at(-1)).toBe("reconnecting:0");
        manager.disconnect();
    });

    it("ignores events of a transport that was replaced", () => {
        const { manager, sockets } = createManager();
        void manager.connect(new URL("ws://test"));
        sockets[0]!.open();

        sockets[0]!.handlers.onClose();
        vi.advanceTimersToNextTimer();
        sockets[1]!.open();
        sockets[0]!.handlers.onClose();
        vi.advanceTimersByTime(1_000);

        expect(sockets).toHaveLength(2);
        expect(manager.isOpen).toBe(true);
        manager.disconnect();
    });

    it("rejects a pending connect() on disconnect", async () => {
        const { manager } = createManager();
        const connected = manager.connect(new URL("ws://test"));
        manager.disconnect();
        await expect(connected).rejects.toThrow("Disconnected.");
    });
});

describe("SocketManager queue", () => {
    it("keeps only the newest frames and warns once", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const { factory, sockets } = createFakeTransport();
        const manager = new SocketManager({
            transport: factory,
            heartbeatIntervalMs: 0,
        });
        const connected = manager.connect(new URL("ws://test"));
        for (let i = 0; i < MAX_PENDING_FRAMES + 5; i++) {
            manager.send(`f${i}`);
        }
        expect(warn).toHaveBeenCalledTimes(1);

        sockets[0]!.open();
        await connected;
        expect(sockets[0]!.sent).toHaveLength(MAX_PENDING_FRAMES);
        expect(sockets[0]!.sent[0]).toBe("f5");
        expect(sockets[0]!.sent.at(-1)).toBe(`f${MAX_PENDING_FRAMES + 4}`);
        manager.disconnect();
        warn.mockRestore();
    });
});

describe("SocketManager messages", () => {
    it("dispatches binary frames and skips frames it cannot parse", async () => {
        const { factory, sockets } = createFakeTransport();
        const manager = new SocketManager({
            transport: factory,
            heartbeatIntervalMs: 0,
        });
        const received: unknown[] = [];
        manager.addListener((message) => received.push(message));
        const connected = manager.connect(new URL("ws://test"));
        sockets[0]!.open();
        await connected;

        sockets[0]!.handlers.onMessage("not json");
        sockets[0]!.handlers.onMessage(
            encodeBinaryMessage(
                { requestId: "r1", namespace: "files", type: "fileData" },
                new Uint8Array([1, 2]),
            ).buffer,
        );

        expect(received).toEqual([
            {
                requestId: "r1",
                namespace: "files",
                type: "fileData",
                binaryData: new Uint8Array([1, 2]),
            },
        ]);
        manager.disconnect();
    });
});

describe("socket service", () => {
    it("matches responses by requestId and rejects unexpected types", async () => {
        const { factory, sockets } = createFakeTransport();
        const manager = new SocketManager({
            transport: factory,
            heartbeatIntervalMs: 0,
        });
        const service = createSocketService(manager);
        const connected = manager.connect(new URL("ws://test"));
        sockets[0]!.open();
        await connected;

        const request = service.sendMessage<
            {
                requestId: string;
                namespace: "tags";
                type: "findTags";
                page: number;
            },
            {
                requestId: string;
                namespace: "tags";
                type: "findTagsResponse";
                total: number;
            }
        >("tags", "findTags", {
            data: { page: 1 },
            expect: "findTagsResponse",
        });

        const sent = JSON.parse(sockets[0]!.sent[0]!) as {
            requestId: string;
            page: number;
        };
        expect(sent.page).toBe(1);

        sockets[0]!.handlers.onMessage(
            JSON.stringify({
                requestId: "other",
                namespace: "tags",
                type: "findTagsResponse",
                total: 0,
            }),
        );
        sockets[0]!.handlers.onMessage(
            JSON.stringify({
                requestId: sent.requestId,
                namespace: "tags",
                type: "findTagsResponse",
                total: 3,
            }),
        );
        await expect(request).resolves.toMatchObject({ total: 3 });

        const bad = service.sendMessage<
            {
                requestId: string;
                namespace: "tags";
                type: "findTags";
                page: number;
            },
            { requestId: string; namespace: "tags"; type: "findTagsResponse" }
        >("tags", "findTags", {
            data: { page: 2 },
            expect: "findTagsResponse",
        });
        const badSent = JSON.parse(sockets[0]!.sent[1]!) as {
            requestId: string;
        };
        sockets[0]!.handlers.onMessage(
            JSON.stringify({
                requestId: badSent.requestId,
                namespace: "system",
                type: "error",
                message: "nope",
            }),
        );
        await expect(bad).rejects.toMatchObject({
            error: "Unexpected response type: error",
        });
        manager.disconnect();
    });
});
