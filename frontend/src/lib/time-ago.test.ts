import { describe, expect, it } from "vitest";
import { timeAgo } from "./time-ago";

describe("timeAgo", () => {
    const now = new Date("2026-10-19T12:00:00Z");
    const seconds = now.getTime() / 1000;

    it.each([
        [seconds - 1, "1 second ago"],
        [seconds - 30, "30 seconds ago"],
        [seconds - 60, "1 minute ago"],
        [seconds - 2 * 3600, "2 hours ago"],
        [seconds - 3 * 86400, "3 days ago"],
        [seconds + 120, "in 2 minutes"],
        [seconds - 200 * 365 * 86400, "a long time ago"],
    ])("formats %d", (time, expected) => {
        expect(timeAgo(time, now)).toBe(expected);
    });
});
