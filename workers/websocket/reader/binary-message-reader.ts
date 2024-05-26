import { BinaryMessage, MessageHeader } from "$workers/websocket/types.ts";

const MAX_BINARY_MESSAGE_SIZE = 2048 * 1024; // 2MB

export const readBinaryMessage = (
    buffer: ArrayBuffer,
): BinaryMessage | null => {
    if (buffer.byteLength > MAX_BINARY_MESSAGE_SIZE) {
        return null;
    }

    const view = new DataView(buffer);

    const headerSize = view.getUint16(0);
    const dataSize = view.getUint32(2);

    if (headerSize + dataSize + 6 !== buffer.byteLength) {
        return null;
    }

    const header = new TextDecoder().decode(
        new Uint8Array(buffer, 6, headerSize),
    );

    const parsedHeader = JSON.parse(header) as MessageHeader;

    return {
        ...parsedHeader,
        binaryData: new Uint8Array(buffer, 6 + headerSize, dataSize),
    };
};
