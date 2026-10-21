import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { roleDefinitions } from "@/lib/rbac";
import { useHelpStore } from "@/stores/help";
import { useUserStore } from "@/stores/user";
import { mockControl } from "@/test/mock-backend";
import HelpWindow from "./HelpWindow.vue";

vi.mock("vue-router", () => ({
    RouterLink: {
        props: ["to"],
        emits: ["click"],
        template: `<a class="router-link" @click="$emit('click')"><slot /></a>`,
    },
}));

describe("HelpWindow", () => {
    beforeEach(() => {
        // jsdom has no modal dialogs.
        HTMLDialogElement.prototype.showModal = function () {
            this.open = true;
        };
        HTMLDialogElement.prototype.close = function () {
            this.open = false;
        };
    });

    const content = (wrapper: ReturnType<typeof mount>) =>
        wrapper.get(".onboarding-contents").text();

    const topics = (wrapper: ReturnType<typeof mount>) =>
        wrapper
            .findAll("[data-test='side-tab-item']")
            .map((item) => item.find("h1").text());

    const signInAs = (role: "admin" | "user") =>
        useUserStore().setSession({
            user: { ...mockControl.state.currentUser, role },
            permissions: [...roleDefinitions[role].permissions],
            required_steps: [],
        });

    const adminTopics = [
        "Admin: Backups",
        "Admin: Periodic tasks",
        "Admin: Users",
        "Admin: Tags",
        "Admin: Files",
        "Admin: Audit log",
        "Admin: AI",
        "Admin: Server log",
    ];

    it("opens on the requested page and follows links between pages", async () => {
        const help = useHelpStore();
        const wrapper = mount(HelpWindow, { attachTo: document.body });
        expect(wrapper.find("dialog").exists()).toBe(false);

        help.open("editing-notes");
        await flushPromises();
        expect(content(wrapper)).toContain("Inserting content");
        expect(content(wrapper)).toContain("headings 1 to 6");
        expect(content(wrapper)).not.toContain("ctrl+q");

        await wrapper
            .findAll(".onboarding-contents span")
            .find((s) => s.text() === "Keyboard Shortcuts")!
            .trigger("click");
        expect(help.page).toBe("keyboard-shortcuts");
        expect(content(wrapper)).not.toContain("alt+i");
        expect(content(wrapper)).toContain(
            "Toggle between preview / editor mode",
        );

        help.open("supported-language-highlights");
        await flushPromises();
        expect(content(wrapper)).toContain("JavaScript");
        expect(
            wrapper.findAll(".onboarding-contents tbody tr").length,
        ).toBeGreaterThan(150);
        wrapper.unmount();
    });

    it("closes when a link leads to an app page", async () => {
        const help = useHelpStore();
        const wrapper = mount(HelpWindow, { attachTo: document.body });
        help.open("sharing-notes");
        await flushPromises();

        await wrapper.get(".onboarding-contents .router-link").trigger("click");
        expect(help.isOpen).toBe(false);
        wrapper.unmount();
    });

    it("lists the admin topics after the user topics for an admin", async () => {
        signInAs("admin");
        const help = useHelpStore();
        const wrapper = mount(HelpWindow, { attachTo: document.body });

        help.open("admin-periodic-tasks");
        await flushPromises();
        expect(topics(wrapper).slice(-adminTopics.length)).toEqual(adminTopics);
        expect(content(wrapper)).toContain("Back up the database");
        expect(content(wrapper)).toContain("PERIODIC_TASK_HISTORY_DAYS");

        help.open("admin-backups");
        await flushPromises();
        expect(content(wrapper)).toContain("BACKUP_ENCRYPTION_KEY");
        wrapper.unmount();
    });

    it("hides the admin topics from a regular user", async () => {
        signInAs("user");
        const help = useHelpStore();
        const wrapper = mount(HelpWindow, { attachTo: document.body });

        help.open("admin-users");
        await flushPromises();
        expect(topics(wrapper)).not.toContain("Admin: Users");
        expect(topics(wrapper).some((name) => name.startsWith("Admin:"))).toBe(
            false,
        );
        expect(content(wrapper)).toContain("General");
        expect(content(wrapper)).not.toContain("Deleting a user");
        wrapper.unmount();
    });
});
