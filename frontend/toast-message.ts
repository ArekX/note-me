import { signal } from "@preact/signals";
import { SystemErrorMessage } from "$frontend/hooks/use-websocket-service.ts";

export interface ToastMessage {
    text: string;
    type: "warning" | "success" | "error" | "info";
}

const MAXIMUM_MESSAGE_DURATION = 5000;

export const toastMessages = signal<ToastMessage[]>([]);

export const addSystemErrorMessage = (error: SystemErrorMessage) => {
    addMessage({
        type: "error",
        text: `Error while processing: ${error.data.message}`,
    });
};

export const addMessage = (message: ToastMessage) => {
    toastMessages.value = [...toastMessages.value, message];
    setTimeout(() => {
        removeMessage(message);
    }, MAXIMUM_MESSAGE_DURATION);
};

export const removeMessage = (message: ToastMessage) => {
    toastMessages.value = toastMessages.value.filter(
        (msg) => msg !== message,
    );
};
