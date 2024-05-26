import { Message } from "$workers/websocket/types.ts";

const MAX_JSON_MESSAGE_SIZE = 1024 * 1024; // 1MB

export const readStringMessage = (message: string): Message | null => {
    if (message.length > MAX_JSON_MESSAGE_SIZE) {
        return null;
    }

    return JSON.parse(message);
};
