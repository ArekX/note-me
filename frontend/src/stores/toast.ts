import { ref } from "vue";
import { defineStore } from "pinia";
import { socketErrorMessage } from "@/lib/error-messages";

export type ToastType = "success" | "warning" | "error" | "info";

export interface ToastMessage {
    id: string;
    type: ToastType;
    text: string;
}

export const DEFAULT_TOAST_TIMEOUT_MS = 5000;

let counter = 0;

export const useToastStore = defineStore("toast", () => {
    const messages = ref<ToastMessage[]>([]);
    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    const removeMessage = (id: string) => {
        messages.value = messages.value.filter((m) => m.id !== id);
        const timer = timers.get(id);
        if (timer) {
            clearTimeout(timer);
            timers.delete(id);
        }
    };

    const addMessage = (
        message: Omit<ToastMessage, "id">,
        id: string = `toast-${++counter}`,
        timeoutMs: number = DEFAULT_TOAST_TIMEOUT_MS,
    ): string => {
        removeMessage(id);
        messages.value = [...messages.value, { ...message, id }];

        if (timeoutMs > 0) {
            timers.set(
                id,
                setTimeout(() => removeMessage(id), timeoutMs),
            );
        }

        return id;
    };

    const reportError = (error: unknown, prefix = "") =>
        addMessage({ type: "error", text: prefix + socketErrorMessage(error) });

    const clear = () => {
        for (const id of [...timers.keys()]) {
            removeMessage(id);
        }
        messages.value = [];
    };

    return { messages, addMessage, removeMessage, reportError, clear };
});
