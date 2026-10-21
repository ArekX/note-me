import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import type { ChatStep } from "@/lib/ai/conversation-view";
import AiToolSteps from "./AiToolSteps.vue";

const step = (overrides: Partial<ChatStep>): ChatStep => ({
    id: "call-1",
    name: "search_notes",
    title: "Search notes",
    arguments: { query: "plan" },
    status: "done",
    result: '{"results":[]}',
    ...overrides,
});

describe("AiToolSteps", () => {
    it("collapses the steps into one group that opens step by step", async () => {
        const wrapper = mount(AiToolSteps, {
            props: {
                steps: [
                    step({}),
                    step({
                        id: "call-2",
                        name: "get_note",
                        title: "Read note",
                        arguments: { id: 3 },
                        status: "failed",
                        result: "Note does not exist.",
                    }),
                ],
            },
        });
        expect(wrapper.text()).toContain("2 steps");
        expect(wrapper.text()).not.toContain("Search notes");

        await wrapper.get("button").trigger("click");
        expect(wrapper.text()).toContain("Search notes: “plan”");
        expect(wrapper.text()).toContain("Read note #3");
        expect(wrapper.text()).not.toContain("Arguments");

        await wrapper.findAll("li button")[1]!.trigger("click");
        expect(wrapper.text()).toContain("Arguments");
        expect(wrapper.text()).toContain("Note does not exist.");

        await wrapper.get("button").trigger("click");
        expect(wrapper.text()).not.toContain("Read note");
    });

    it("opens itself and offers Allow and Deny for a waiting step", async () => {
        const wrapper = mount(AiToolSteps, {
            props: {
                steps: [
                    step({
                        name: "delete_folder",
                        title: "Delete folder",
                        arguments: { id: 4 },
                        status: "waiting",
                        result: null,
                    }),
                ],
            },
        });
        expect(wrapper.text()).toContain("1 step");
        expect(wrapper.text()).toContain("Delete folder #4");
        const buttons = wrapper.findAll("button");
        await buttons.find((b) => b.text() === "Allow")!.trigger("click");
        await buttons.find((b) => b.text() === "Deny")!.trigger("click");
        expect(wrapper.emitted("allow")).toEqual([["call-1"]]);
        expect(wrapper.emitted("deny")).toEqual([["call-1"]]);
    });
});
