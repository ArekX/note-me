import { useScriptsReadyEffect } from "$frontend/hooks/use-scripts-ready.ts";
import { socketManager } from "$frontend/socket-manager.ts";
import { Message } from "$workers/websocket/types.ts";

type EventMap<T extends Message> = Partial<
    { [K in T["type"]]: (data: Extract<T, { type: K }>) => void }
>;
type NamespaceMap<T extends Message> = Partial<
    {
        [K in T["namespace"]]: EventMap<Extract<T, { namespace: K }>>;
    }
>;

interface WebSocketEventOptions<T extends Message> {
    messageNamespace: T["namespace"];
    eventMap?: NamespaceMap<T>;
}

export interface ErrorResponse<T> {
    error: string;
    data: T;
}

export const useWebsocketService = <T extends Message>(
    options: WebSocketEventOptions<T>,
) => {
    const { eventMap } = options;

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

            socketManager.addListener<T>(handleWebsocketMessage);

            return () => {
                socketManager.removeListener<T>(handleWebsocketMessage);
            };
        });
    }

    const dispatchMessage = <T extends Message>(
        message: T | Omit<T, "namespace" | "requestId">,
    ) => socketManager.send({
        requestId: crypto.randomUUID(),
        namespace: options.messageNamespace,
        ...message,
    });

    const sendMessage = <
        Request extends Message,
        Response extends Message,
    >(data: {
        request: Request | Omit<Request, "namespace" | "requestId">;
        require: Response["type"];
        requireNamespace?: Response["namespace"];
    }): Promise<Response> => {
        const {
            request,
            require,
            requireNamespace = null,
        } = data;

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
                    data.type !== require ||
                    (requireNamespace && data.namespace !== requireNamespace)
                ) {
                    reject({
                        error: `Unexpected response type: ${data.type}`,
                        data: data as Message,
                    } as ErrorResponse<Message>);
                } else {
                    resolve(data as Response);
                }

                socketManager.removeListener(responseHandler);
            };

            socketManager.addListener(responseHandler);
            socketManager.send({
                requestId,
                namespace: options.messageNamespace,
                ...request,
            });
        });

        return Promise.race([
            mainRequest,
            timeoutError,
        ]);
    };

    return { dispatchMessage, sendMessage };
};
