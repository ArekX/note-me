import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { useHelpStore } from "@/stores/help";
import { useSocketStore } from "@/stores/socket";
import { useUserStore } from "@/stores/user";
import ViewNoteIntroduction from "./ViewNoteIntroduction.vue";

const clickButton = async (wrapper: ReturnType<typeof mount>, text: string) => {
    await wrapper
        .findAll("button")
        .find((b) => b.text() === text)!
        .trigger("click");
    await flushPromises();
};

describe("OnboardingDialog", () => {
    beforeEach(async () => {
        // jsdom has no modal dialogs.
        HTMLDialogElement.prototype.showModal = function () {
            this.open = true;
        };
        HTMLDialogElement.prototype.close = function () {
            this.open = false;
        };
        await useSocketStore().connect();
        useUserStore().setSession({
            user: { ...mockControl.state.currentUser },
            permissions: [],
            required_steps: [],
        });
    });

    afterEach(() => {
        useSocketStore().disconnect();
        document.body.innerHTML = "";
    });

    it("closes without saving", async () => {
        const wrapper = mount(ViewNoteIntroduction, {
            attachTo: document.body,
        });
        expect(wrapper.text()).toContain("This is a view page for your note.");

        await clickButton(wrapper, "Close");
        expect(wrapper.find("dialog").exists()).toBe(false);
        expect(
            mockControl.state.currentUser.onboarding_state
                .view_note_introduction_dismissed,
        ).toBeUndefined();
    });

    it("stores the dismissal and keeps the other keys", async () => {
        const wrapper = mount(ViewNoteIntroduction, {
            attachTo: document.body,
        });

        await clickButton(wrapper, "Don't show this again");
        await vi.waitFor(() =>
            expect(
                useUserStore().user?.onboarding_state
                    .view_note_introduction_dismissed,
            ).toBe(true),
        );
        expect(mockControl.state.currentUser.onboarding_state).toEqual({
            introduction_dismissed: true,
            view_note_introduction_dismissed: true,
        });
        expect(wrapper.find("dialog").exists()).toBe(false);

        // A new page does not show it again.
        const again = mount(ViewNoteIntroduction, { attachTo: document.body });
        expect(again.find("dialog").exists()).toBe(false);
    });

    it("closes when a help link is followed", async () => {
        const wrapper = mount(ViewNoteIntroduction, {
            attachTo: document.body,
        });

        await wrapper
            .findAll("span")
            .find((s) => s.text() === "note sharing")!
            .trigger("click");
        expect(useHelpStore().page).toBe("sharing-notes");
        expect(wrapper.find("dialog").exists()).toBe(false);
    });
});
