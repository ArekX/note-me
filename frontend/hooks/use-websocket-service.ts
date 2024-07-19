import {
    BinaryMessage,
    ErrorMessage,
    Message,
} from "$workers/websocket/types.ts";
import {
    addListener,
    removeListener,
    send,
    sendBinary,
} from "$frontend/socket-manager.ts";
import { useEffect } from "preact/hooks";

type EventMap<T extends Message> = Partial<
    { [K in T["type"]]: (data: Extract<T, { type: K }>) => void }
>;
type NamespaceMap<T extends Message> = Partial<
    {
        [K in T["namespace"]]: EventMap<Extract<T, { namespace: K }>>;
    }
>;

interface WebSocketEventOptions<T extends Message> {
    eventMap?: NamespaceMap<T>;
}

type PayloadData<T extends Message> = Omit<
    T,
    "requestId" | "namespace" | "type"
>;

type MessagePayload<Request extends Message, Response extends Message> =
    & {
        expect: Response["type"];
        expectNamespace?: Response["namespace"];
    }
    & (PayloadData<Request> extends Record<string | number | symbol, never>
        ? Record<string | number | symbol, unknown>
        : {
            data: PayloadData<Request>;
        });

export interface ErrorResponse<T> {
    error: string;
    data: T;
}

export type SystemErrorMessage = ErrorResponse<ErrorMessage>;

const textEncoder = new TextEncoder();

const createBinaryMessage = <T extends BinaryMessage>(
    request: Omit<T, "binaryData">,
    data: ArrayBuffer,
): Uint8Array => {
    const headers = JSON.stringify({
        ...request,
    });
    const encodedHeaders = textEncoder.encode(headers);
    const headerLength = encodedHeaders.byteLength;
    const dataLength = data.byteLength;

    const message = new Uint8Array(6 + headerLength + dataLength);

    message[0] = headerLength >> 8;
    message[1] = headerLength & 0xff;
    message[2] = dataLength >> 24;
    message[3] = (dataLength >> 16) & 0xff;
    message[4] = (dataLength >> 8) & 0xff;
    message[5] = dataLength & 0xff;

    message.set(encodedHeaders, 6);
    message.set(new Uint8Array(data), 6 + headerLength);

    return message;
};

const runRequestResponse = <Response extends Message>(
    runRequest: (requestId: string) => void,
    expect: Response["type"],
    expectNamespace?: Response["namespace"],
) => {
    const timeoutError = new Promise<Response>((_, reject) =>
        setTimeout(() => {
            reject(
                {
                    error: "No response received after 15s.",
                } as ErrorResponse<never>,
            );
        }, 15000)
    );

    const requestId = crypto.randomUUID();

    const mainRequest = new Promise<Response>((resolve, reject) => {
        const responseHandler = (data: Message) => {
            if (data.requestId !== requestId) {
                return;
            }

            if (
                data.type !== expect ||
                (expectNamespace && data.namespace !== expectNamespace)
            ) {
                reject({
                    error: `Unexpected response type: ${data.type}`,
                    data: data as Message,
                } as ErrorResponse<Message>);
            } else {
                resolve(data as Response);
            }

            removeListener(responseHandler);
        };

        addListener(responseHandler);
        runRequest(requestId);
    });

    return Promise.race([
        mainRequest,
        timeoutError,
    ]);
};

export const useWebsocketService = <T extends Message>(
    options?: WebSocketEventOptions<T>,
) => {
    if (options?.eventMap) {
        useEffect(() => {
            const handleWebsocketMessage = (data: T) => {
                options.eventMap![data.namespace as T["namespace"]]
                    ?.[data.type as T["type"]]?.(
                        data as Extract<
                            Extract<T, { namespace: T["namespace"] }>,
                            { type: T["type"] }
                        >,
                    );
            };

            addListener(handleWebsocketMessage);

            return () => {
                removeListener(handleWebsocketMessage);
            };
        }, [options?.eventMap]);
    }

    const dispatchMessage = <T extends Message>(
        namespace: T["namespace"],
        type: T["type"],
        message?: Omit<T, "requestId" | "namespace" | "type">,
    ) => send({
        ...message,
        requestId: crypto.randomUUID(),
        namespace,
        type,
    });

    const sendMessage = <
        Request extends Message,
        Response extends Message,
    >(
        namespace: Request["namespace"],
        type: Request["type"],
        payload: MessagePayload<Request, Response>,
    ): Promise<Response> => {
        const {
            data,
            expect,
            expectNamespace = namespace,
        } = payload;

        return runRequestResponse<Response>(
            (requestId) =>
                send({
                    ...data as Record<string, unknown>,
                    requestId,
                    namespace,
                    type,
                }),
            expect,
            expectNamespace,
        );
    };

    const dispatchBinaryMessage = <T extends BinaryMessage>(
        namespace: string,
        type: string,
        request: Omit<T, "requestId" | "namespace" | "type" | "binaryData">,
        data: ArrayBuffer,
    ) => {
        sendBinary(createBinaryMessage({
            ...request,
            requestId: crypto.randomUUID(),
            namespace,
            type,
        }, data));
    };

    const sendBinaryMessage = <
        Request extends BinaryMessage,
        Response extends Message,
    >(
        namespace: Request["namespace"],
        type: Request["type"],
        payload: MessagePayload<Request, Response>,
    ): Promise<Response> => {
        const {
            data,
            expect,
            expectNamespace = namespace,
        } = payload;

        const { binaryData, ...request } = data as Request;

        return runRequestResponse<Response>(
            (requestId) =>
                sendBinary(createBinaryMessage({
                    ...request,
                    requestId,
                    type,
                    namespace,
                }, binaryData)),
            expect,
            expectNamespace,
        );
    };

    return {
        dispatchMessage,
        sendMessage,
        dispatchBinaryMessage,
        sendBinaryMessage,
    };
};
