import type {
    BinaryMessage,
    ErrorMessage,
    Message,
    MessagePayload,
} from "@/types/messages";
import { encodeBinaryMessage } from "./binary";
import type { SocketManager } from "./manager";

export const REQUEST_TIMEOUT_MS = 15000;

export interface ErrorResponse<T = unknown> {
    error: string;
    data: T;
}

export type SystemErrorMessage = ErrorResponse<ErrorMessage>;

export const isSystemError = (value: unknown): value is SystemErrorMessage =>
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    typeof (value as { data?: { type?: string } }).data?.type === "string" &&
    (value as { data: { type: string } }).data.type === "error";

export type EventMap<T extends Message> = {
    [K in T["type"]]?: (data: Extract<T, { type: K }>) => void;
};

export type NamespaceEventMap<T extends Message = Message> = {
    [K in T["namespace"]]?: EventMap<Extract<T, { namespace: K }>>;
};

export type RequestOptions<
    Request extends Message,
    Response extends Message,
> = {
    expect: Response["type"];
    expectNamespace?: Response["namespace"];
    // For messages answered later than REQUEST_TIMEOUT_MS.
    timeoutMs?: number;
    // Changes the assistant makes count as made elsewhere, so open pages and
    // lists react to them like to another tab.
    notOwn?: boolean;
} & (MessagePayload<Request> extends Record<string, never>
    ? { data?: undefined }
    : { data: MessagePayload<Request> });

export const createRequestId = (): string => crypto.randomUUID();

// Enough for every request still waiting plus recent ones whose response
// listeners run after the request resolved.
const TRACKED_REQUEST_IDS = 500;

export const createSocketService = (manager: SocketManager) => {
    // Responses reach every tab of the user with the request id; a tab knows
    // its own requests by the ids it sent.
    const ownRequestIds = new Set<string>();
    const nextRequestId = () => {
        const requestId = createRequestId();
        ownRequestIds.add(requestId);
        if (ownRequestIds.size > TRACKED_REQUEST_IDS) {
            ownRequestIds.delete(ownRequestIds.values().next().value!);
        }
        return requestId;
    };
    const isOwnRequest = (requestId: string) => ownRequestIds.has(requestId);

    const awaitResponse = <Response extends Message>(
        requestId: string,
        expect: Response["type"],
        expectNamespace: string | undefined,
        run: () => void,
        timeoutMs = REQUEST_TIMEOUT_MS,
    ): Promise<Response> =>
        new Promise<Response>((resolve, reject) => {
            const timeout = setTimeout(() => {
                manager.removeListener(handler);
                reject({
                    error: `No response received after ${timeoutMs / 1000}s.`,
                    data: null,
                } satisfies ErrorResponse<null>);
            }, timeoutMs);

            const handler = (raw: unknown) => {
                const message = raw as Message;
                if (message.requestId !== requestId) {
                    return;
                }

                clearTimeout(timeout);
                manager.removeListener(handler);

                const namespaceOk =
                    !expectNamespace || message.namespace === expectNamespace;
                if (message.type === expect && namespaceOk) {
                    resolve(message as Response);
                } else {
                    reject({
                        error: `Unexpected response type: ${message.type}`,
                        data: message,
                    } satisfies ErrorResponse<Message>);
                }
            };

            manager.addListener(handler);
            run();
        });

    const dispatchMessage = <T extends Message>(
        namespace: T["namespace"],
        type: T["type"],
        payload?: MessagePayload<T>,
    ): void => {
        manager.send(
            JSON.stringify({
                ...payload,
                requestId: nextRequestId(),
                namespace,
                type,
            }),
        );
    };

    const sendMessage = <Request extends Message, Response extends Message>(
        namespace: Request["namespace"],
        type: Request["type"],
        options: RequestOptions<Request, Response>,
    ): Promise<Response> => {
        const {
            expect,
            expectNamespace = namespace,
            data,
            timeoutMs,
            notOwn,
        } = options;
        const requestId = notOwn ? createRequestId() : nextRequestId();

        return awaitResponse<Response>(
            requestId,
            expect,
            expectNamespace,
            () =>
                manager.send(
                    JSON.stringify({ ...data, requestId, namespace, type }),
                ),
            timeoutMs,
        );
    };

    const dispatchBinaryMessage = <T extends BinaryMessage>(
        namespace: T["namespace"],
        type: T["type"],
        payload: Omit<MessagePayload<T>, "binaryData">,
        data: Uint8Array,
    ): void => {
        manager.send(
            encodeBinaryMessage(
                { ...payload, requestId: nextRequestId(), namespace, type },
                data,
            ),
        );
    };

    const sendBinaryMessage = <
        Request extends BinaryMessage,
        Response extends Message,
    >(
        namespace: Request["namespace"],
        type: Request["type"],
        options: RequestOptions<Request, Response>,
    ): Promise<Response> => {
        const { expect, expectNamespace = namespace } = options;
        const { binaryData, ...payload } = options.data as Request;
        const requestId = nextRequestId();

        return awaitResponse<Response>(requestId, expect, expectNamespace, () =>
            manager.send(
                encodeBinaryMessage(
                    { ...payload, requestId, namespace, type },
                    binaryData,
                ),
            ),
        );
    };

    const listen = <T extends Message>(
        eventMap: NamespaceEventMap<T>,
    ): (() => void) =>
        manager.addListener((raw) => {
            const message = raw as T;
            const namespaceHandlers = eventMap[
                message.namespace as T["namespace"]
            ] as EventMap<T> | undefined;
            namespaceHandlers?.[message.type as T["type"]]?.(
                message as Extract<T, { type: T["type"] }>,
            );
        });

    return {
        dispatchMessage,
        sendMessage,
        dispatchBinaryMessage,
        sendBinaryMessage,
        listen,
        isOwnRequest,
    };
};

export type SocketService = ReturnType<typeof createSocketService>;
