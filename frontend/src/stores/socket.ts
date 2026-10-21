import { ref } from "vue";
import { defineStore } from "pinia";
import {
    MAX_RETRIES,
    SocketManager,
    createSocketService,
    type SocketStatus,
    type SocketStatusEvent,
} from "@/lib/socket";
import { useToastStore } from "./toast";

export const useSocketStore = defineStore("socket", () => {
    const status = ref<SocketStatus>("disconnected");

    let manager: SocketManager | null = null;
    let service: ReturnType<typeof createSocketService> | null = null;

    const reportStatus = (event: SocketStatusEvent) => {
        status.value = event.status;
        const toast = useToastStore();

        switch (event.status) {
            case "reconnecting":
                toast.addMessage(
                    {
                        type: "warning",
                        text: `Connection to the server was lost. Attempting to reconnect (${event.attempt ?? 0}/${MAX_RETRIES})...`,
                    },
                    "socket-reconnect",
                    0,
                );
                break;
            case "connected":
                toast.removeMessage("socket-reconnect");
                if (event.restored) {
                    toast.addMessage({
                        type: "success",
                        text: "Connection to the server was restored.",
                    });
                }
                break;
            case "failed":
                toast.removeMessage("socket-reconnect");
                toast.addMessage(
                    {
                        type: "error",
                        text: `Connection to the server failed after ${MAX_RETRIES} attempts. Please refresh the page to try again.`,
                    },
                    "socket-failed",
                    0,
                );
                break;
            default:
                break;
        }
    };

    const getManager = (): SocketManager => {
        if (!manager) {
            manager = new SocketManager();
            manager.onStatus(reportStatus);
            service = createSocketService(manager);
        }
        return manager;
    };

    const connect = async (): Promise<void> => {
        const url = new URL("/ws", location.origin);
        url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        await getManager().connect(url);
    };

    const disconnect = () => {
        manager?.disconnect();
        status.value = "disconnected";
    };

    const getService = async () => {
        getManager();
        return service!;
    };

    const isOwnRequest = (requestId: string) =>
        service?.isOwnRequest(requestId) ?? false;

    return {
        status,
        connect,
        disconnect,
        getManager,
        getService,
        isOwnRequest,
    };
});
