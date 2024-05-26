import { useScriptsReadyEffect } from "$frontend/hooks/use-scripts-ready.ts";
import { BinaryMessage, Message } from "$workers/websocket/types.ts";
import {
    addListener,
    removeListener,
    send,
    sendBinary,
} from "$frontend/socket-manager.ts";

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

export interface ErrorResponse<T> {
    error: string;
    data: T;
}

export const useWebsocketService = <T extends Message>(
    options?: WebSocketEventOptions<T>,
) => {
    const { eventMap } = options ?? {};

    if (eventMap) {
        useScriptsReadyEffect(() => {
            const handleWebsocketMessage = (data: T) => {
                eventMap[data.namespace as T["namespace"]]
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
        });
    }

    const dispatchMessage = <T extends Message>(
        namespace: T["namespace"],
        type: T["type"],
        message?: Omit<T, "requestId" | "namespace" | "type">,
    ) => send({
        requestId: crypto.randomUUID(),
        namespace,
        type,
        ...message,
    });

    const sendMessage = <
        Request extends Message,
        Response extends Message,
    >(
        namespace: Request["namespace"],
        type: Request["type"],
        payload: {
            data: Omit<Request, "requestId" | "namespace" | "type">;
            expect: Response["type"];
            expectNamespace?: Response["namespace"];
        },
    ): Promise<Response> => {
        const {
            data,
            expect,
            expectNamespace = namespace,
        } = payload;

        const requestId = crypto.randomUUID();

        const timeoutError = new Promise<Response>((_, reject) =>
            setTimeout(() => {
                reject(
                    {
                        error: "No response received after 15s.",
                    } as ErrorResponse<never>,
                );
            }, 15000)
        );

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
            send({ requestId, namespace, type, ...data });
        });

        return Promise.race([
            mainRequest,
            timeoutError,
        ]);
    };

    const sendBinaryMessage = <T extends BinaryMessage>(
        namespace: string,
        type: string,
        request: Omit<T, "requestId" | "namespace" | "type" | "binaryData">,
        data: ArrayBuffer,
    ) => {
        const headers = JSON.stringify({
            requestId: crypto.randomUUID(),
            namespace,
            type,
            ...request,
        });
        const encodedHeaders = new TextEncoder().encode(headers);
        const headerLength = encodedHeaders.byteLength;
        const dataLength = data.byteLength;

        const payload = new Uint8Array(6 + headerLength + dataLength);

        payload[0] = headerLength >> 8;
        payload[1] = headerLength & 0xff;
        payload[2] = dataLength >> 24;
        payload[3] = (dataLength >> 16) & 0xff;
        payload[4] = (dataLength >> 8) & 0xff;
        payload[5] = dataLength & 0xff;

        payload.set(encodedHeaders, 6);
        payload.set(new Uint8Array(data), 6 + headerLength);

        sendBinary(payload);
    };

    return { dispatchMessage, sendMessage, sendBinaryMessage };
};
