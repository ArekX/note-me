import { describe, expect, it } from "vitest";
import { diffText } from "./diff";

describe("diffText", () => {
    it("pairs a removed run followed by an added run as changed lines", () => {
        expect(diffText("a\nb\nc\nd", "a\nB\nC\nX\nd")).toEqual([
            { type: "same", value: "a" },
            { type: "changed", from: "b", to: "B" },
            { type: "changed", from: "c", to: "C" },
            { type: "added", value: "X" },
            { type: "same", value: "d" },
        ]);
    });

    it("keeps one inserted line from marking every later line changed", () => {
        expect(diffText("a\nb\nc", "new\na\nb\nc")).toEqual([
            { type: "added", value: "new" },
            { type: "same", value: "a" },
            { type: "same", value: "b" },
            { type: "same", value: "c" },
        ]);
    });

    it("leaves unpaired removals as removed", () => {
        expect(diffText("a\nb\nc", "a")).toEqual([
            { type: "same", value: "a" },
            { type: "removed", value: "b" },
            { type: "removed", value: "c" },
        ]);
        expect(diffText("same", "same")).toEqual([
            { type: "same", value: "same" },
        ]);
    });
});
