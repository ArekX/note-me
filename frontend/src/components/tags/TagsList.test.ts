import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { useSocketStore } from "@/stores/socket";
import { useToastStore } from "@/stores/toast";
import { useUserStore } from "@/stores/user";
import type { DataChangedResponse } from "@/types/messages";
import TagsList from "./TagsList.vue";

const tagNames = (wrapper: VueWrapper) =>
    wrapper.findAll("[data-test=tag-name]").map((tag) => tag.text().slice(1));

const mountList = async () => {
    const wrapper = mount(TagsList, { attachTo: document.body });
    await vi.waitFor(() => expect(tagNames(wrapper).length).toBeGreaterThan(0));
    return wrapper;
};

const clickButton = async (wrapper: VueWrapper, text: string) => {
    await wrapper
        .findAll("button")
        .find((b) => b.text() === text)!
        .trigger("click");
    await flushPromises();
};

describe("TagsList", () => {
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
            permissions: ["canReadTags", "canUpdateTags"],
            required_steps: [],
        });
    });

    afterEach(() => {
        useSocketStore().disconnect();
        document.body.innerHTML = "";
    });

    it("searches tags by name", async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const wrapper = await mountList();
        expect(tagNames(wrapper)).toContain("reading");

        await wrapper.get('input[placeholder="Search tags"]').setValue("rea");
        vi.advanceTimersByTime(500);
        await vi.waitFor(() => expect(tagNames(wrapper)).toEqual(["reading"]));
        vi.useRealTimers();
    });

    it("renames a tag and validates the name", async () => {
        const wrapper = await mountList();
        await wrapper
            .findAll("[data-test=tag-name]")
            .find((tag) => tag.text() === "#idea")!
            .trigger("click");

        const input = wrapper.get(".tag-input");
        await input.setValue("");
        await input.trigger("keydown", { key: "Enter" });
        await flushPromises();
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain(
                "Name must have at least one character",
            ),
        );

        await input.setValue("ideas");
        await input.trigger("keydown", { key: "Enter" });
        await vi.waitFor(() => expect(tagNames(wrapper)).toContain("ideas"));
        expect(mockControl.state.notes.find((n) => n.id === 3)?.tags).toContain(
            "ideas",
        );
    });

    it("deletes a tag after confirmation", async () => {
        const wrapper = await mountList();
        const index = tagNames(wrapper).indexOf("todo");
        await wrapper.findAll('[title="Delete tag"]')[index]!.trigger("click");
        await clickButton(wrapper, "Delete this tag");

        await vi.waitFor(() => expect(tagNames(wrapper)).not.toContain("todo"));
        expect(
            mockControl.state.notes.some((n) => n.tags.includes("todo")),
        ).toBe(false);
    });

    it("shows the permission error for a user role", async () => {
        mockControl.state.currentUser.role = "user";
        const wrapper = await mountList();
        const index = tagNames(wrapper).indexOf("todo");
        await wrapper.findAll('[title="Delete tag"]')[index]!.trigger("click");
        await clickButton(wrapper, "Delete this tag");

        await vi.waitFor(() =>
            expect(useToastStore().messages.at(-1)?.text).toBe(
                "User does not have the required permission: canUpdateTags",
            ),
        );
        expect(tagNames(wrapper)).toContain("todo");
    });

    it("reloads when another user changes tags", async () => {
        const wrapper = await mountList();
        expect(tagNames(wrapper)).not.toContain("from-elsewhere");

        mockControl.state.tags.push({ id: 900, name: "from-elsewhere" });
        mockControl.push<DataChangedResponse>("changes", "dataChanged", {
            entity: "tag",
            ids: [900],
        });
        await vi.waitFor(() =>
            expect(tagNames(wrapper)).toContain("from-elsewhere"),
        );
        wrapper.unmount();
    });
});
