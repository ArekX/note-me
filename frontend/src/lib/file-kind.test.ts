import { describe, expect, it } from "vitest";
import { fileKind } from "./file-kind";

describe("fileKind", () => {
    it.each([
        ["image/png", "image"],
        ["image/svg+xml", "image"],
        ["text/markdown", "document"],
        ["application/pdf", "document"],
        [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "document",
        ],
        ["application/vnd.oasis.opendocument.text", "document"],
        ["application/zip", "other"],
        ["video/mp4", "other"],
    ])("%s is %s", (mimeType, kind) => {
        expect(fileKind(mimeType)).toBe(kind);
    });
});
