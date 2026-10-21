import { describe, expect, it } from "vitest";
import { findFileIdentifiers } from "./markdown-links";

describe("findFileIdentifiers", () => {
    it("finds uploaded files in links and images, once each", () => {
        const text = [
            "![photo](/file/aaa-111)",
            "[report](/file/bbb-222?download) and [again](/file/aaa-111)",
            `[absolute](${location.origin}/file/ccc-333)`,
            "[elsewhere](https://example.com/file/ddd-444)",
            "Plain /file/eee-555 text and `[code](/file/fff-666)`",
        ].join("\n\n");

        expect(findFileIdentifiers(text)).toEqual([
            "aaa-111",
            "bbb-222",
            "ccc-333",
        ]);
    });
});
