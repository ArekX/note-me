import { signal } from "@preact/signals";
import { SystemErrorMessage } from "$frontend/hooks/use-websocket-service.ts";

export interface ToastMessage {
    text: string;
    type: "warning" | "success" | "error" | "info";
}

interface PushedMessages extends ToastMessage {
    identifier: string;
    timeoutId: number;
}

const MAXIMUM_MESSAGE_DURATION = 5000;

export const toastMessages = signal<PushedMessages[]>([]);

export const addSystemErrorMessage = (error: SystemErrorMessage) => {
    addMessage({
        type: "error",
        text: `Error while processing: ${error.data.message}`,
    });
};

export const addMessage = (message: ToastMessage, messageId?: string) => {
    if (messageId && updateMessage(messageId, message)) {
        return messageId;
    }

    const identifier = messageId ?? crypto.randomUUID();

    toastMessages.value = [...toastMessages.value, {
        ...message,
        identifier,
        timeoutId: setTimeout(() => {
            removeMessage(identifier);
        }, MAXIMUM_MESSAGE_DURATION),
    }];

    return identifier;
};

export const updateMessage = (messageId: string, message: ToastMessage) => {
    const existingMessage = toastMessages.value.find(
        (msg) => msg.identifier === messageId,
    );

    if (!existingMessage) {
        return false;
    }

    existingMessage.text = message.text;
    existingMessage.type = message.type;
    clearTimeout(existingMessage.timeoutId);
    existingMessage.timeoutId = setTimeout(() => {
        removeMessage(messageId);
    }, MAXIMUM_MESSAGE_DURATION);
    toastMessages.value = [...toastMessages.value];
    return true;
};

export const removeMessage = (messageId: string) => {
    const message = toastMessages.value.find(
        (msg) => msg.identifier === messageId,
    );

    if (!message) {
        return;
    }

    clearTimeout(message.timeoutId);
    toastMessages.value = toastMessages.value.filter(
        (msg) => msg !== message,
    );
};
