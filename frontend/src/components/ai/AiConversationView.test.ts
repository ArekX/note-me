import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { useAiStore } from "@/stores/ai";
import { useSocketStore } from "@/stores/socket";
import AiConversationView from "./AiConversationView.vue";

const addConversation = (locked: boolean) => {
    const conversation = {
        id: 50,
        title: "Old plans",
        created_at: 1,
        updated_at: 2,
    };
    mockControl.state.ai.conversations.push(conversation);
    mockControl.state.ai.messages.set(50, [
        {
            id: 1,
            role: "user",
            content: "Plan my week",
            tool_calls: null,
            tool_call_id: null,
            tool_name: null,
            tool_status: null,
            created_at: 1,
        },
        {
            id: 2,
            role: "assistant",
            content: "",
            tool_calls: [{ id: "c1", name: "get_tree", arguments: {} }],
            tool_call_id: null,
            tool_name: null,
            tool_status: null,
            created_at: 1,
        },
        {
            id: 3,
            role: "tool",
            content: "{}",
            tool_calls: null,
            tool_call_id: "c1",
            tool_name: "get_tree",
            tool_status: "done",
            created_at: 1,
        },
        {
            id: 4,
            role: "assistant",
            content: "Here is **your** week.",
            tool_calls: null,
            tool_call_id: null,
            tool_name: null,
            tool_status: null,
            created_at: 1,
        },
    ]);
    if (locked) {
        mockControl.state.ai.lockedConversations.add(50);
    }
};

describe("AiConversationView", () => {
    beforeEach(async () => {
        mockControl.state.ai.access = { enabled: true };
        await useSocketStore().connect();
    });

    afterEach(() => {
        useSocketStore().disconnect();
    });

    it("shows a locked conversation read only", async () => {
        addConversation(true);
        const ai = useAiStore();
        await ai.init();
        await ai.open(50);
        const wrapper = mount(AiConversationView);
        await flushPromises();

        expect(wrapper.text()).toContain(
            "Your AI access changed, so this conversation can be read but not continued.",
        );
        expect(wrapper.find("textarea").exists()).toBe(false);
        expect(wrapper.text()).toContain("Plan my week");
        expect(wrapper.find("strong").text()).toBe("your");
        await vi.waitFor(() => expect(wrapper.text()).toContain("1 step"));
    });

    it("offers the composer in an open conversation", async () => {
        addConversation(false);
        const ai = useAiStore();
        await ai.init();
        await ai.open(50);
        const wrapper = mount(AiConversationView);
        await flushPromises();

        expect(wrapper.text()).not.toContain("Your AI access changed");
        await wrapper.get("textarea").setValue("And next week?");
        await wrapper.get("textarea").trigger("keydown", { key: "Enter" });
        await vi.waitFor(() => expect(ai.turn).not.toBeNull());
        expect(wrapper.text()).toContain("And next week?");
        expect(wrapper.find('button[title="Stop"]').exists()).toBe(true);
    });
});
