import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { useSocketStore } from "@/stores/socket";
import { useToastStore } from "@/stores/toast";
import { useUserStore } from "@/stores/user";
import NoteShare from "./NoteShare.vue";

const clickButton = async (wrapper: VueWrapper, text: string) => {
    await wrapper
        .findAll("button")
        .find((b) => b.text() === text)!
        .trigger("click");
    await flushPromises();
};

const mountShare = async (noteId: number, isProtected = false) => {
    const wrapper = mount(NoteShare, {
        props: { noteId, isProtected },
        attachTo: document.body,
    });
    await vi.waitFor(() =>
        expect(wrapper.text()).toContain(
            isProtected ? "cannot be shared" : "Share status",
        ),
    );
    return wrapper;
};

describe("NoteShare", () => {
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

    it("finds users to share with, excluding the current user", async () => {
        const wrapper = await mountShare(1);
        expect(wrapper.text()).toContain("Private");

        await wrapper
            .get('input[placeholder="Name or Username"]')
            .setValue("a");
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain("No users found"),
        );

        await wrapper
            .get('input[placeholder="Name or Username"]')
            .setValue("ma");
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain("Marko Marković (marko)"),
        );
        expect(wrapper.text()).not.toContain("(admin)");

        await wrapper
            .get('button[title="Add Marko Marković to selected users"]')
            .trigger("click");
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain("Specific users only"),
        );
        expect(
            mockControl.state.userShares.some(
                (s) => s.note_id === 1 && s.user_id === 3,
            ),
        ).toBe(true);
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain("No users found"),
        );

        await wrapper
            .get('button[title="Remove Marko Marković from selected users"]')
            .trigger("click");
        await vi.waitFor(() => expect(wrapper.text()).toContain("Private"));
    });

    it("refuses to share a protected note", async () => {
        const wrapper = await mountShare(1, true);
        expect(wrapper.text()).toContain("Protected notes cannot be shared.");
        expect(wrapper.text()).not.toContain("Share status");
        expect(wrapper.find("input").exists()).toBe(false);
        expect(
            mockControl.log.some(
                (entry) =>
                    entry.direction === "out" &&
                    entry.message.type === "getNoteShareData",
            ),
        ).toBe(false);
    });

    it("shows the server's refusal as a toast", async () => {
        const wrapper = await mountShare(1);
        mockControl.state.notes.find((n) => n.id === 1)!.is_encrypted = true;
        await clickButton(wrapper, "To everyone");
        await clickButton(wrapper, "Create link");
        await vi.waitFor(() =>
            expect(useToastStore().messages.map((m) => m.text)).toContain(
                "Protected notes cannot be shared.",
            ),
        );
        expect(wrapper.text()).toContain("No public links created.");
    });

    it("creates and deletes public links", async () => {
        const wrapper = await mountShare(1);
        await clickButton(wrapper, "To everyone");
        expect(wrapper.text()).toContain("No public links created.");

        await clickButton(wrapper, "Create link");
        await vi.waitFor(() => expect(wrapper.text()).toContain("Link: "));
        const link = mockControl.state.linkShares.find((l) => l.note_id === 1)!;
        expect(wrapper.text()).toContain(`Link: ${link.identifier}`);
        expect(wrapper.text()).toContain("Share status: Public");

        await wrapper.get('button[title="Delete link"]').trigger("click");
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain("No public links created."),
        );
        expect(wrapper.text()).toContain("Share status: Private");
    });

    it("needs a date when the link expires", async () => {
        const wrapper = await mountShare(1);
        await clickButton(wrapper, "To everyone");
        await wrapper.get('input[type="checkbox"]').setValue(true);

        expect(wrapper.text()).toContain("Please enter expiration date.");
        const create = wrapper
            .findAll("button")
            .find((b) => b.text() === "Create link")!;
        expect(create.attributes("disabled")).toBeDefined();
    });
});
