import type { ErrorMessage, Message, MessagePayload } from "@/types/messages";
import { decodeBinaryMessage } from "@/lib/socket/binary";
import type {
    SocketTransport,
    TransportFactory,
    TransportHandlers,
} from "@/lib/socket/transport";
import { mockHandlers } from "./handlers";
import type { MockContext } from "./handler";
import { createMockState, type MockState } from "./state";

export type MockLogDirection = "out" | "in";

export interface MockLogEntry {
    direction: MockLogDirection;
    message: Message & Record<string, unknown>;
    binaryBytes?: number;
}

export interface MockControl {
    state: MockState;
    readonly log: MockLogEntry[];
    push: <R extends Message>(
        namespace: R["namespace"],
        type: R["type"],
        data?: MessagePayload<R>,
    ) => void;
    resetState: () => void;
    clearLog: () => void;
}

export const createMockTransport = (): {
    transport: TransportFactory;
    control: MockControl;
} => {
    let active: { handlers: TransportHandlers; open: boolean } | null = null;

    const control: MockControl = {
        state: createMockState(),
        log: [],
        push: (namespace, type, data) =>
            deliver({
                ...(data as object),
                requestId: crypto.randomUUID(),
                namespace,
                type,
            }),
        resetState: () => {
            control.state = createMockState();
            control.log.length = 0;
        },
        clearLog: () => {
            control.log.length = 0;
        },
    };

    const record = (
        direction: MockLogDirection,
        message: Message & Record<string, unknown>,
        binaryBytes?: number,
    ) => {
        control.log.unshift({ direction, message, binaryBytes });
    };

    const deliver = (message: Message & Record<string, unknown>) => {
        if (!active?.open) {
            return;
        }
        record("in", message);
        const target = active;
        setTimeout(() => {
            if (target.open) {
                target.handlers.onMessage(JSON.stringify(message));
            }
        });
    };

    const handle = (
        message: Message & Record<string, unknown>,
        binaryData?: Uint8Array,
    ) => {
        record("out", message, binaryData?.byteLength);

        const respondError = (text: string) =>
            deliver({
                requestId: message.requestId,
                namespace: "system",
                type: "error",
                message: text,
            } satisfies ErrorMessage);

        const handler = mockHandlers[message.namespace]?.[message.type];
        if (!handler) {
            respondError(
                `No mock handler for ${message.namespace}/${message.type}`,
            );
            return;
        }

        const ctx: MockContext = {
            state: control.state,
            respond: (type, data) =>
                deliver({
                    ...(data as object),
                    requestId: message.requestId,
                    namespace: message.namespace,
                    type,
                }),
            push: (namespace, type, data) =>
                control.push(namespace, type, data),
            fail: respondError,
        };

        Promise.resolve(handler({ ...message, binaryData }, ctx)).catch(
            (error: unknown) =>
                respondError(
                    error instanceof Error ? error.message : String(error),
                ),
        );
    };

    const transport: TransportFactory = (_url, handlers) => {
        const session = { handlers, open: false };
        active = session;

        setTimeout(() => {
            if (active === session) {
                session.open = true;
                handlers.onOpen();
            }
        });

        const socket: SocketTransport = {
            get isOpen() {
                return session.open;
            },
            send: (frame) => {
                if (!session.open) {
                    return;
                }
                if (typeof frame === "string") {
                    handle(
                        JSON.parse(frame) as Message & Record<string, unknown>,
                    );
                    return;
                }
                const decoded = decodeBinaryMessage(frame.buffer);
                if (decoded) {
                    const { binaryData, ...header } = decoded;
                    handle(
                        header as Message & Record<string, unknown>,
                        binaryData,
                    );
                }
            },
            close: () => {
                if (session.open) {
                    session.open = false;
                    active = null;
                    handlers.onClose();
                }
            },
        };

        return socket;
    };

    return { transport, control };
};
