import { describe, expect, it } from "vitest";
import {
    findTagSides,
    getFormattedTagString,
    getTagArray,
    tagsToString,
} from "./tags";
import { markdownFileName } from "./text-downloader";

describe("tags", () => {
    it("sanitises and dedupes a tag string", () => {
        expect(getTagArray("#work  #home!! #work #a--b #c__d")).toEqual([
            "work",
            "home",
            "a-b",
            "c_d",
        ]);
        expect(getTagArray(" # ")).toEqual([]);
        expect(getFormattedTagString("work home")).toBe("#work #home");
        expect(tagsToString([])).toBe("");
    });

    it("finds the tag under the caret", () => {
        expect(findTagSides("#work #home", 8)).toEqual({
            tag: "home",
            leftIndex: 6,
            rightIndex: 11,
        });
        expect(findTagSides("#work #home", 5)).toBeNull();
        expect(findTagSides("#", 0)).toBeNull();
    });
});

describe("markdownFileName", () => {
    it("lowercases the title and replaces other characters", () => {
        expect(markdownFileName("My Note: v2!")).toBe("my_note__v2_.md");
    });
});
