import {
    readBinaryMessage,
} from "$workers/websocket/reader/binary-message-reader.ts";
import { BinaryMessage, Message } from "$workers/websocket/types.ts";
import { readStringMessage } from "$workers/websocket/reader/string-message-reader.ts";

export const readMessage = (
    message: string | ArrayBuffer,
): Message | BinaryMessage | null => {
    try {
        if (message instanceof ArrayBuffer) {
            return readBinaryMessage(message);
        } else if (typeof message === "string") {
            return readStringMessage(message);
        }

        return null;
    } catch {
        return null;
    }
};
