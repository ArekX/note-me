import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { useAiStore } from "@/stores/ai";
import { useSocketStore } from "@/stores/socket";
import AppRail from "./AppRail.vue";

vi.mock("vue-router", async (importOriginal) => ({
    ...(await importOriginal<typeof import("vue-router")>()),
    RouterLink: { template: "<a><slot /></a>" },
}));

describe("AppRail", () => {
    beforeEach(async () => {
        await useSocketStore().connect();
    });

    afterEach(() => {
        useSocketStore().disconnect();
    });

    it("shows the AI icon only while the user has access", async () => {
        const wrapper = mount(AppRail);
        const aiButton = () => wrapper.find('button[aria-label="AI"]');
        await useAiStore().init();
        expect(aiButton().exists()).toBe(false);

        mockControl.state.ai.access = { enabled: true };
        mockControl.push("ai", "accessChanged");
        await vi.waitFor(() => expect(aiButton().exists()).toBe(true));

        const labels = wrapper
            .findAll("nav > button")
            .map((b) => b.attributes("aria-label"));
        expect(labels.indexOf("AI")).toBe(labels.indexOf("Recycle bin") + 1);

        mockControl.state.ai.access = { enabled: false };
        mockControl.push("ai", "accessChanged");
        await vi.waitFor(() => expect(aiButton().exists()).toBe(false));
    });
});
