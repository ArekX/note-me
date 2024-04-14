import { useScriptsReadyEffect } from "$frontend/hooks/use-scripts-ready.ts";
import { socketManager } from "$frontend/socket-manager.ts";

interface WebSocketEventOptions<T extends { type: string }> {
    eventMap: { [K in T["type"]]: (data: Extract<T, { type: K }>) => void };
}

export const useWebsocketEvent = <T extends { type: string }>(
    options: WebSocketEventOptions<T>,
) => {
    const { eventMap } = options;

    useScriptsReadyEffect(() => {
        const handleWebsocketMessage = (data: T) => {
            if (data.type in eventMap) {
                eventMap[data.type as T["type"]](
                    data as Extract<T, { type: T["type"] }>,
                );
            }
        };

        socketManager.addMessageListener<T>(handleWebsocketMessage);

        return () => {
            socketManager.removeMessageListener<T>(handleWebsocketMessage);
        };
    });

    const dispatchEvent = <T>(message: T) => socketManager.send<T>(message);

    return { dispatchEvent };
};
