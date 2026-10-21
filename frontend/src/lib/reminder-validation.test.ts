import { describe, expect, it } from "vitest";
import { validateDateTime, validateRepeat } from "./reminder-validation";

describe("reminder validation", () => {
    it("requires a future date and time", () => {
        expect(validateDateTime("", "10:00")).toEqual([
            "Please enter reminder date.",
        ]);
        expect(validateDateTime("2000-01-01", "10:00")).toEqual([
            "Reminder date is in the past.",
        ]);
        expect(validateDateTime("2999-01-01", "10:00")).toEqual([]);
    });

    it("requires positive numbers for interval and repeat", () => {
        expect(validateRepeat(1, 1)).toEqual([]);
        expect(validateRepeat(0, NaN)).toEqual([
            "Please enter a valid number for repeat.",
            "Please enter a positive number for interval.",
        ]);
    });
});
