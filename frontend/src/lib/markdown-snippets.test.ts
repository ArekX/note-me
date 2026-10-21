import { describe, expect, it } from "vitest";
import {
    alignOf,
    getAlignedImageMarkdown,
    getImageMarkdown,
    getMediaMarkdown,
    getLinkMarkdown,
    getTableMarkdown,
    getFileMarkdown,
    playableMediaUrl,
} from "./markdown-snippets";

describe("markdown snippets", () => {
    it("escapes every parenthesis in URLs", () => {
        expect(getLinkMarkdown("https://e.com/a_(b)_(c)", "x")).toBe(
            "[x](https://e.com/a_%28b%29_%28c%29)",
        );
        expect(getImageMarkdown("/i.png", "alt")).toBe("![alt](/i.png)");
    });

    it("pads every table cell to the longest one", () => {
        const rows = [
            ["Name", "Qty"],
            ["Apples", "3"],
        ];
        expect(getTableMarkdown(rows)).toBe(
            [
                "| Name   | Qty    |",
                "| ------ | ------ |",
                "| Apples | 3      |",
            ].join("\n"),
        );
        expect(rows).toHaveLength(2);
        expect(getTableMarkdown([])).toBe("");
    });

    it("inserts a file as an image, a player or a download link", () => {
        const file = (mime_type: string) => ({
            identifier: "f1",
            name: "thing",
            mime_type,
        });
        expect(getFileMarkdown(file("image/png"))).toBe("![thing](/file/f1)");
        expect(getFileMarkdown(file("audio/mpeg"))).toBe("{:audio|/file/f1}");
        expect(getFileMarkdown(file("video/mp4"))).toBe("{:video|/file/f1}");
        expect(getFileMarkdown(file("application/pdf"))).toBe(
            "[thing](/file/f1?download)",
        );
    });

    it("plays only uploaded files and http(s) addresses", () => {
        expect(playableMediaUrl(" /file/f1 ")).toBe("/file/f1");
        expect(playableMediaUrl("HTTPS://e.com/a.mp3")).toBe(
            "HTTPS://e.com/a.mp3",
        );
        expect(playableMediaUrl("javascript:alert(1)")).toBeNull();
        expect(playableMediaUrl("data:audio/mp3;base64,AA")).toBeNull();
        expect(playableMediaUrl(undefined)).toBeNull();
    });
});

describe("aligned media", () => {
    it("writes the alignment only when it is not left", () => {
        expect(getMediaMarkdown("audio", "/file/a")).toBe("{:audio|/file/a}");
        expect(getMediaMarkdown("video", "/file/v", "left")).toBe(
            "{:video|/file/v}",
        );
        expect(getMediaMarkdown("audio", "/file/a", "center")).toBe(
            "{:audio|/file/a|center}",
        );
    });

    it("keeps image parameters inside the extension", () => {
        expect(getAlignedImageMarkdown("/file/i", "A cat", "right")).toBe(
            "{:image|/file/i|right|A cat}",
        );
        expect(getAlignedImageMarkdown("/a|b}", "x | y}\nz", "center")).toBe(
            "{:image|/a%7Cb%7D|center|x y z}",
        );
        expect(getAlignedImageMarkdown("/file/i", "", "center")).toBe(
            "{:image|/file/i|center}",
        );
    });

    it("reads unknown alignments as left", () => {
        expect(alignOf("center")).toBe("center");
        expect(alignOf(" right ")).toBe("right");
        expect(alignOf("middle")).toBe("left");
        expect(alignOf(undefined)).toBe("left");
    });
});
