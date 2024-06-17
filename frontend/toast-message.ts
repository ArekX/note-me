import { signal } from "@preact/signals";

export interface ToastMessage {
    text: string;
    type: "warning" | "success" | "error";
}

const MAXIMUM_MESSAGE_DURATION = 5000;

export const toastMessages = signal<ToastMessage[]>([]);

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
