import { describe, expect, it, vi } from "vitest";
import { useToastStore } from "./toast";

describe("toast store", () => {
    it("adds, replaces by id and removes messages", () => {
        const toast = useToastStore();

        toast.addMessage({ type: "info", text: "one" }, "same", 0);
        toast.addMessage({ type: "warning", text: "two" }, "same", 0);
        const id = toast.addMessage(
            { type: "error", text: "three" },
            undefined,
            0,
        );

        expect(toast.messages).toHaveLength(2);
        expect(toast.messages[0]!.text).toBe("two");

        toast.removeMessage(id);
        expect(toast.messages.map((m) => m.text)).toEqual(["two"]);
    });

    it("auto removes messages after the timeout", () => {
        vi.useFakeTimers();
        const toast = useToastStore();

        toast.addMessage({ type: "success", text: "bye" }, "t", 100);
        expect(toast.messages).toHaveLength(1);

        vi.advanceTimersByTime(101);
        expect(toast.messages).toHaveLength(0);
        vi.useRealTimers();
    });
});
