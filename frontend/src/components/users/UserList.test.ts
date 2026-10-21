import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { useSocketStore } from "@/stores/socket";
import { useToastStore } from "@/stores/toast";
import { useUserStore } from "@/stores/user";
import UserList from "./UserList.vue";

const usernames = (wrapper: VueWrapper) =>
    wrapper
        .findAll("tbody tr")
        .map((row) => row.findAll("td")[1]?.text())
        .filter(Boolean);

const openDialog = (wrapper: VueWrapper) =>
    wrapper.findAll("dialog").find((d) => d.element.open)!;

const fill = async (wrapper: VueWrapper, label: string, value: string) => {
    const field = openDialog(wrapper)
        .findAll("label")
        .find((l) => l.text() === label)!
        .element.parentElement!.querySelector("input")!;
    field.value = value;
    field.dispatchEvent(new Event("input"));
    await flushPromises();
};

const submit = async (wrapper: VueWrapper) => {
    await openDialog(wrapper).get("form").trigger("submit");
    await flushPromises();
};

describe("UserList", () => {
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
            permissions: ["canUpdateUsers"],
            required_steps: [],
        });
    });

    afterEach(() => {
        useSocketStore().disconnect();
        document.body.innerHTML = "";
    });

    const mountList = async () => {
        const wrapper = mount(UserList, { attachTo: document.body });
        await vi.waitFor(() =>
            expect(usernames(wrapper)).toEqual(["admin", "jane", "marko"]),
        );
        return wrapper;
    };

    it("filters by username and role", async () => {
        const wrapper = await mountList();

        const usernameFilter = wrapper.get(
            'input[placeholder="Search username"]',
        );
        await usernameFilter.setValue("mar");
        await vi.waitFor(() => expect(usernames(wrapper)).toEqual(["marko"]), {
            timeout: 2000,
        });

        await usernameFilter.setValue("");
        const roleFilter = wrapper.get("select");
        await roleFilter.setValue("1");
        await vi.waitFor(() => expect(usernames(wrapper)).toEqual(["admin"]), {
            timeout: 2000,
        });
    });

    it("adds a user after client validation passes", async () => {
        const wrapper = await mountList();

        await wrapper
            .findAll("button")
            .find((b) => b.text() === "Add")!
            .trigger("click");
        await flushPromises();
        await fill(wrapper, "Username", "new");
        await fill(wrapper, "Name", "New Person");
        await fill(wrapper, "Set new password", "short");
        await submit(wrapper);
        expect(openDialog(wrapper).text()).toContain(
            "Password must have at least 8 characters",
        );

        await fill(wrapper, "Set new password", "password123");
        await submit(wrapper);
        await vi.waitFor(() =>
            expect(usernames(wrapper)).toEqual([
                "admin",
                "jane",
                "marko",
                "new",
            ]),
        );
        expect(useToastStore().messages.at(-1)?.text).toBe(
            "User created successfully.",
        );
    });

    it("edits another user without requiring a new password", async () => {
        const wrapper = await mountList();

        await wrapper.findAll('button[title="Edit"]')[1]!.trigger("click");
        await flushPromises();
        expect(openDialog(wrapper).text()).toContain("Edit jane");
        await fill(wrapper, "Set new password", "x");
        await fill(wrapper, "Set new password", "");
        await fill(wrapper, "Name", "Jane Renamed");
        await submit(wrapper);

        await vi.waitFor(() =>
            expect(mockControl.state.users[1]!.name).toBe("Jane Renamed"),
        );
    });

    it("locks the own role and hides the own delete button", async () => {
        const wrapper = await mountList();

        const deleteButtons = wrapper.findAll('button[title="Delete"]');
        expect(deleteButtons).toHaveLength(2);

        await wrapper.findAll('button[title="Edit"]')[0]!.trigger("click");
        await flushPromises();
        const dialog = openDialog(wrapper);
        expect(dialog.text()).toContain("You cannot change your own role.");
        expect(dialog.text()).toContain(
            "Please change your password via profile page.",
        );
        expect(
            (dialog.findAll("select")[1]!.element as HTMLSelectElement)
                .disabled,
        ).toBe(true);
    });

    it("deletes a user after confirmation", async () => {
        const wrapper = await mountList();

        await wrapper.findAll('button[title="Delete"]')[0]!.trigger("click");
        await flushPromises();
        await openDialog(wrapper)
            .findAll("button")
            .find((b) => b.text() === "Delete user")!
            .trigger("click");

        await vi.waitFor(() =>
            expect(usernames(wrapper)).toEqual(["admin", "marko"]),
        );
    });
});
