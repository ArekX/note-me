import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { MOCK_PASSWORD } from "@/test/mock-backend";
import { useAiPasswordStore } from "@/stores/ai-password";
import { useSocketStore } from "@/stores/socket";
import AiPasswordDialog from "./AiPasswordDialog.vue";

describe("AiPasswordDialog", () => {
    beforeEach(async () => {
        HTMLDialogElement.prototype.showModal = function () {
            this.open = true;
        };
        HTMLDialogElement.prototype.close = function () {
            this.open = false;
        };
        await useSocketStore().connect();
    });

    afterEach(() => {
        useSocketStore().disconnect();
        document.body.innerHTML = "";
    });

    it("answers with the password once it is right", async () => {
        const wrapper = mount(AiPasswordDialog, { attachTo: document.body });
        const answer = useAiPasswordStore().ask({
            title: "Remove a passkey",
            message: "Enter your password.",
            confirmLabel: "Remove passkey",
        });
        await flushPromises();
        const input = () => wrapper.get('input[type="password"]');
        expect(input().attributes("autofocus")).toBeDefined();

        await input().setValue("wrong");
        await wrapper
            .findAll("button")
            .find((b) => b.text() === "Remove passkey")!
            .trigger("click");
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain("Invalid password"),
        );
        await vi.waitFor(() =>
            expect(document.activeElement).toBe(input().element),
        );

        await input().setValue(MOCK_PASSWORD);
        await input().trigger("keydown", { key: "Enter" });
        expect(await answer).toBe(MOCK_PASSWORD);
        expect(wrapper.find("dialog").exists()).toBe(false);
    });

    it("answers null on Cancel", async () => {
        const wrapper = mount(AiPasswordDialog, { attachTo: document.body });
        const answer = useAiPasswordStore().ask({
            title: "Add a passkey",
            message: "",
            confirmLabel: "Continue",
        });
        await flushPromises();
        await wrapper
            .findAll("button")
            .find((b) => b.text() === "Cancel")!
            .trigger("click");
        expect(await answer).toBeNull();
    });
});
