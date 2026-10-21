import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { useProtectionLockStore } from "@/stores/protection-lock";
import { useSocketStore } from "@/stores/socket";
import { useToastStore } from "@/stores/toast";
import { useUserStore } from "@/stores/user";
import UserProfile from "./UserProfile.vue";

const fill = async (wrapper: VueWrapper, label: string, value: string) => {
    const field = wrapper
        .findAll("label")
        .find((l) => l.text() === label)!
        .element.parentElement!.querySelector("input")!;
    field.value = value;
    field.dispatchEvent(new Event("input"));
    await flushPromises();
};

const submit = async (wrapper: VueWrapper) => {
    await wrapper.get("form").trigger("submit");
    await flushPromises();
};

describe("UserProfile", () => {
    beforeEach(async () => {
        await useSocketStore().connect();
        useUserStore().setSession({
            user: { ...mockControl.state.currentUser },
            permissions: [],
            required_steps: [],
        });
    });

    afterEach(() => {
        useSocketStore().disconnect();
    });

    it("updates the name and timezone", async () => {
        const wrapper = mount(UserProfile);
        await fill(wrapper, "Name", "Renamed");
        await submit(wrapper);

        await vi.waitFor(() =>
            expect(useToastStore().messages.at(-1)?.text).toBe(
                "Profile updated successfully.",
            ),
        );
        expect(useUserStore().user?.name).toBe("Renamed");
        expect(mockControl.state.currentUser.name).toBe("Renamed");
    });

    it("switches the note editor", async () => {
        const wrapper = mount(UserProfile);
        const select = wrapper
            .findAll("label")
            .find((l) => l.text() === "Note editor")!
            .element.parentElement!.querySelector("select")!;
        select.value = "1";
        select.dispatchEvent(new Event("input"));
        await submit(wrapper);

        await vi.waitFor(() =>
            expect(useUserStore().user?.preferred_editor).toBe("source"),
        );
        expect(mockControl.state.currentUser.preferred_editor).toBe("source");
    });

    it("sets the profile picture from an image and removes it", async () => {
        HTMLDialogElement.prototype.showModal = function () {
            this.open = true;
        };
        const wrapper = mount(UserProfile, { attachTo: document.body });
        const button = (text: string) =>
            wrapper.findAll("button").find((b) => b.text() === text)!;

        await button("Add picture").trigger("click");
        await vi.waitFor(() =>
            expect(wrapper.findAll(".group").map((i) => i.text())).toEqual([
                expect.stringContaining("architecture.png"),
            ]),
        );
        expect(button("Use as profile picture").attributes()).toHaveProperty(
            "disabled",
        );
        await wrapper.get(".group").trigger("click");
        await button("Use as profile picture").trigger("click");

        await vi.waitFor(() =>
            expect(wrapper.text()).not.toContain("Choose profile picture"),
        );
        expect(mockControl.state.currentUser.profile_picture).toBe(
            "mock-file-1",
        );
        expect(wrapper.get("img.rounded-full").attributes("src")).toBe(
            "/file/mock-file-1",
        );

        await button("Remove").trigger("click");
        await vi.waitFor(() =>
            expect(useUserStore().user?.profile_picture).toBeNull(),
        );
        expect(mockControl.state.currentUser.profile_picture).toBeNull();
        expect(button("Add picture").exists()).toBe(true);
        wrapper.unmount();
    });

    it("shows the password refinement on both fields", async () => {
        const wrapper = mount(UserProfile);
        await fill(wrapper, "Old Password", "admin");
        await fill(wrapper, "New Password", "longenough1");
        await fill(wrapper, "Confirm Password", "longenough2");
        await submit(wrapper);

        expect(wrapper.text()).toContain(
            "New password must match confirm password and must be at least 8 characters.",
        );
        expect(wrapper.text()).toContain(
            "Confirm password must match new password and must be at least 8 characters.",
        );
        expect(useToastStore().messages).toHaveLength(0);
    });

    it("asks for the old password when the password changes", async () => {
        const wrapper = mount(UserProfile);
        await fill(wrapper, "New Password", "newpassword");
        await fill(wrapper, "Confirm Password", "newpassword");
        await submit(wrapper);

        expect(wrapper.text()).toContain(
            "Old password is required to change the password.",
        );
        expect(useToastStore().messages).toHaveLength(0);
    });

    it("reports a wrong old password and re-primes an unlocked lock", async () => {
        const lock = useProtectionLockStore();
        lock.resolveUnlockRequest("admin");
        const wrapper = mount(UserProfile);

        await fill(wrapper, "Old Password", "wrong");
        await fill(wrapper, "New Password", "newpassword");
        await fill(wrapper, "Confirm Password", "newpassword");
        await submit(wrapper);
        await vi.waitFor(() =>
            expect(useToastStore().messages.at(-1)?.text).toBe(
                "Failed to update profile: Old password is incorrect",
            ),
        );

        await fill(wrapper, "Old Password", "admin");
        await submit(wrapper);
        await vi.waitFor(() =>
            expect(useToastStore().messages.at(-1)?.text).toBe(
                "Profile updated successfully.",
            ),
        );
        await expect(lock.requestUnlock()).resolves.toBe("newpassword");
    });
});
