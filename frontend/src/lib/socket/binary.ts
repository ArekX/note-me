import type { MessageHeader } from "@/types/messages";

// Binary frame layout shared with the backend:
//   [2 bytes header length][4 bytes data length][JSON header][payload]
const FRAME_PREFIX = 6;

export const MAX_BINARY_MESSAGE_SIZE = 2048 * 1024;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const encodeBinaryMessage = (
    header: MessageHeader & Record<string, unknown>,
    data: Uint8Array,
): Uint8Array<ArrayBuffer> => {
    const encodedHeader = encoder.encode(JSON.stringify(header));
    const headerLength = encodedHeader.byteLength;
    const dataLength = data.byteLength;

    const frame = new Uint8Array(FRAME_PREFIX + headerLength + dataLength);
    const view = new DataView(frame.buffer);
    view.setUint16(0, headerLength);
    view.setUint32(2, dataLength);
    frame.set(encodedHeader, FRAME_PREFIX);
    frame.set(data, FRAME_PREFIX + headerLength);

    return frame;
};

export const decodeBinaryMessage = <
    T extends MessageHeader = MessageHeader & Record<string, unknown>,
>(
    buffer: ArrayBuffer,
): (T & { binaryData: Uint8Array }) | null => {
    if (
        buffer.byteLength < FRAME_PREFIX ||
        buffer.byteLength > MAX_BINARY_MESSAGE_SIZE
    ) {
        return null;
    }

    const view = new DataView(buffer);
    const headerLength = view.getUint16(0);
    const dataLength = view.getUint32(2);

    if (FRAME_PREFIX + headerLength + dataLength !== buffer.byteLength) {
        return null;
    }

    const header = JSON.parse(
        decoder.decode(new Uint8Array(buffer, FRAME_PREFIX, headerLength)),
    ) as T;

    return {
        ...header,
        binaryData: new Uint8Array(
            buffer,
            FRAME_PREFIX + headerLength,
            dataLength,
        ),
    };
};
