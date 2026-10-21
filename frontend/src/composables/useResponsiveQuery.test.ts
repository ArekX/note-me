import { describe, expect, it } from "vitest";
import { sizeForWidth } from "./useResponsiveQuery";

describe("sizeForWidth", () => {
    it("uses the original breakpoints", () => {
        expect(sizeForWidth(767)).toBe("sm");
        expect(sizeForWidth(768)).toBe("md");
        expect(sizeForWidth(1023)).toBe("md");
        expect(sizeForWidth(1024)).toBe("lg");
        expect(sizeForWidth(1280)).toBe("xl");
        expect(sizeForWidth(1536)).toBe("2xl");
    });
});
