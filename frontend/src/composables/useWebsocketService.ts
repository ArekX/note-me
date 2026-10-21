import { onBeforeUnmount, onMounted } from "vue";
import type { BinaryMessage, Message, MessagePayload } from "@/types/messages";
import type { NamespaceEventMap, RequestOptions } from "@/lib/socket";
import { useSocketStore } from "@/stores/socket";

export const useWebsocketService = <T extends Message = Message>(
    eventMap?: NamespaceEventMap<T>,
) => {
    const socketStore = useSocketStore();
    let unsubscribe: (() => void) | null = null;

    onMounted(async () => {
        if (eventMap) {
            const service = await socketStore.getService();
            unsubscribe = service.listen(eventMap);
        }
    });

    onBeforeUnmount(() => {
        unsubscribe?.();
        unsubscribe = null;
    });

    const sendMessage = async <
        Request extends Message,
        Response extends Message,
    >(
        namespace: Request["namespace"],
        type: Request["type"],
        options: RequestOptions<Request, Response>,
    ): Promise<Response> =>
        (await socketStore.getService()).sendMessage<Request, Response>(
            namespace,
            type,
            options,
        );

    const dispatchMessage = async <M extends Message>(
        namespace: M["namespace"],
        type: M["type"],
        payload?: MessagePayload<M>,
    ): Promise<void> =>
        (await socketStore.getService()).dispatchMessage<M>(
            namespace,
            type,
            payload,
        );

    const sendBinaryMessage = async <
        Request extends BinaryMessage,
        Response extends Message,
    >(
        namespace: Request["namespace"],
        type: Request["type"],
        options: RequestOptions<Request, Response>,
    ): Promise<Response> =>
        (await socketStore.getService()).sendBinaryMessage<Request, Response>(
            namespace,
            type,
            options,
        );

    const dispatchBinaryMessage = async <M extends BinaryMessage>(
        namespace: M["namespace"],
        type: M["type"],
        payload: Omit<MessagePayload<M>, "binaryData">,
        data: Uint8Array,
    ): Promise<void> =>
        (await socketStore.getService()).dispatchBinaryMessage<M>(
            namespace,
            type,
            payload,
            data,
        );

    return {
        sendMessage,
        dispatchMessage,
        sendBinaryMessage,
        dispatchBinaryMessage,
    };
};
