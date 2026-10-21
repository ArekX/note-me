import { describe, expect, it } from "vitest";
import { findHighlightedLines } from "./text-highlight";

// Expected values are the output of the original app's text highlighter.
describe("findHighlightedLines", () => {
    it("highlights every match and keeps the rest of a partly matched word", () => {
        expect(
            findHighlightedLines(
                "Buy milk and more milk\nthen milkshake",
                "milk",
                100,
            ),
        ).toEqual([
            [
                { type: "text", value: "Buy " },
                { type: "highlight", value: "milk" },
                { type: "text", value: " and more " },
                { type: "highlight", value: "milk" },
                { type: "text", value: " then " },
                { type: "highlight", value: "milk" },
                { type: "text", value: "shake" },
            ],
        ]);
    });

    it("wraps matches over lines case-insensitively", () => {
        expect(
            findHighlightedLines("Go is great. GO GO go.", "go", 10),
        ).toEqual([
            [
                { type: "text", value: "" },
                { type: "highlight", value: "Go" },
                { type: "text", value: "... " },
                { type: "highlight", value: "GO" },
                { type: "text", value: " " },
            ],
            [
                { type: "highlight", value: "GO" },
                { type: "text", value: " " },
                { type: "highlight", value: "go" },
                { type: "text", value: "." },
            ],
        ]);
    });

    it("returns at most three lines", () => {
        const text = "Lorem ipsum dolor sit amet, elit. ".repeat(50);
        expect(findHighlightedLines(text, "elit", 40)).toHaveLength(3);
    });

    it("returns nothing without text, query or match", () => {
        expect(findHighlightedLines("", "a", 100)).toEqual([]);
        expect(findHighlightedLines("abc", "", 100)).toEqual([]);
        expect(findHighlightedLines("short text", "z", 100)).toEqual([]);
    });
});
