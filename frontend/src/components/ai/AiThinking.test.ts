import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { turnStatus } from "@/lib/ai/conversation-view";
import type { AiRound, AiStep } from "@/stores/ai";
import AiThinking from "./AiThinking.vue";

const step = (status: AiStep["status"]): AiStep => ({
    call: {
        id: "c",
        name: "get_tree",
        title: "List folder",
        arguments: {},
        confirm: false,
        protected: "",
        browser: false,
        message: null,
    },
    status,
    result: null,
    protected: false,
});

describe("thinking indicator", () => {
    it("says what the live answer is doing", () => {
        const rounds = (...list: AiRound[]) => list;
        expect(turnStatus(rounds({ text: "", steps: [] }))).toBe("thinking");
        expect(turnStatus(rounds({ text: "Hello", steps: [] }))).toBe(
            "writing",
        );
        expect(
            turnStatus(
                rounds(
                    { text: "", steps: [step("running")] },
                    { text: "", steps: [] },
                ),
            ),
        ).toBe("working");
        expect(
            turnStatus(
                rounds(
                    { text: "", steps: [step("done"), step("waiting")] },
                    { text: "", steps: [] },
                ),
            ),
        ).toBe("waiting");
        expect(
            turnStatus(
                rounds(
                    { text: "", steps: [step("done")] },
                    { text: "", steps: [] },
                ),
            ),
        ).toBe("thinking");
    });

    it("shows dots and a label", () => {
        const thinking = mount(AiThinking, { props: { status: "thinking" } });
        expect(thinking.text()).toBe("Thinking");
        expect(thinking.findAll(".ai-thinking-dots span")).toHaveLength(3);
        expect(thinking.attributes("role")).toBe("status");

        const waiting = mount(AiThinking, { props: { status: "waiting" } });
        expect(waiting.text()).toBe("Waiting for you");
        expect(waiting.find(".ai-thinking-dots").exists()).toBe(false);
    });
});
