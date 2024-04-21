import { useScriptsReadyEffect } from "$frontend/hooks/use-scripts-ready.ts";
import { socketManager } from "$frontend/socket-manager.ts";
import { Message } from "$workers/websocket/types.ts";

interface WebSocketEventOptions<T extends Message> {
    defaultNamespace: T["namespace"];
    responseMap?: Partial<
        { [K in T["type"]]: (data: Extract<T, { type: K }>) => void }
    >;
}

export const useWebsocketService = <T extends Message>(
    options: WebSocketEventOptions<T>,
) => {
    const { responseMap } = options;

    if (responseMap) {
        useScriptsReadyEffect(() => {
            const handleWebsocketMessage = (data: T) => {
                responseMap[data.type as T["type"]]?.(
                    data as Extract<T, { type: T["type"] }>,
                );
            };

            socketManager.addListener<T>(handleWebsocketMessage);

            return () => {
                socketManager.removeListener<T>(handleWebsocketMessage);
            };
        });
    }

    const dispatchRequest = <T extends Message>(
        message: T | Omit<T, "namespace" | "requestId">,
    ) => socketManager.send({
        requestId: crypto.randomUUID(),
        namespace: options.defaultNamespace,
        ...message,
    });

    const sendRequest = <
        Request extends Message,
        Response extends Message,
    >(data: {
        request: Request | Omit<Request, "namespace" | "requestId">;
        response: Response["type"] | {
            type: Response["type"];
            namespace: Response["namespace"];
        };
    }): Promise<Response> => {
        const {
            request,
        } = data;

        const requestId = crypto.randomUUID();

        return new Promise((resolve) => {
            const responseHandler = (data: Message) => {
                if (data.requestId !== requestId) {
                    return;
                }

                // TODO: Handle error responses
                resolve(data as Response);

                socketManager.removeListener(responseHandler);
            };

            socketManager.addListener(responseHandler);
            socketManager.send({
                requestId,
                namespace: options.defaultNamespace,
                ...request,
            });
        });
    };

    return { dispatchRequest, sendRequest };
};
