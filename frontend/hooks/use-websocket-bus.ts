import { useScriptsReadyEffect } from "$frontend/hooks/use-scripts-ready.ts";
import { socketManager } from "$frontend/socket-manager.ts";
import { Message } from "$workers/websocket/types.ts";

interface WebSocketEventOptions<T extends Message> {
    namespace: T["namespace"];
    responseMap: { [K in T["type"]]: (data: Extract<T, { type: K }>) => void };
}

export const useWebsocketBus = <T extends Message>(
    options: WebSocketEventOptions<T>,
) => {
    const { responseMap } = options;

    useScriptsReadyEffect(() => {
        const handleWebsocketMessage = (data: T) => {
            if (data.type in responseMap) {
                responseMap[data.type as T["type"]](
                    data as Extract<T, { type: T["type"] }>,
                );
            }
        };

        socketManager.addMessageListener<T>(handleWebsocketMessage);

        return () => {
            socketManager.removeMessageListener<T>(handleWebsocketMessage);
        };
    });

    const request = <T extends Message>(message: T | Omit<T, "namespace">) =>
        socketManager.send({
            namespace: options.namespace,
            ...message,
        });

    return { request };
};
