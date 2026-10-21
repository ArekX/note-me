import { describe, expect, it } from "vitest";
import { decodeBinaryMessage, encodeBinaryMessage } from "./binary";

describe("binary frames", () => {
    it("round-trips header and payload", () => {
        const payload = new Uint8Array([1, 2, 3, 250, 251]);
        const frame = encodeBinaryMessage(
            {
                requestId: "r1",
                namespace: "files",
                type: "sendFileData",
                target_id: "t1",
            },
            payload,
        );

        const view = new DataView(frame.buffer);
        expect(view.getUint32(2)).toBe(payload.byteLength);

        const decoded = decodeBinaryMessage<{
            requestId: string;
            namespace: string;
            type: string;
            target_id: string;
        }>(frame.buffer);
        expect(decoded?.target_id).toBe("t1");
        expect(decoded?.type).toBe("sendFileData");
        expect(Array.from(decoded!.binaryData)).toEqual([1, 2, 3, 250, 251]);
    });

    it("rejects frames whose lengths do not add up", () => {
        const frame = encodeBinaryMessage(
            { requestId: "r", namespace: "n", type: "t" },
            new Uint8Array([9]),
        );
        expect(
            decodeBinaryMessage(frame.buffer.slice(0, frame.byteLength - 1)),
        ).toBeNull();
    });
});
