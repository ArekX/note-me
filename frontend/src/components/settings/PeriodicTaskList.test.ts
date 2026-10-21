import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { roleDefinitions, type Role } from "@/lib/rbac";
import { useSocketStore } from "@/stores/socket";
import { useToastStore } from "@/stores/toast";
import { useUserStore } from "@/stores/user";
import PeriodicTaskList from "./PeriodicTaskList.vue";

describe("PeriodicTaskList", () => {
    beforeEach(async () => {
        // jsdom has no modal dialogs.
        HTMLDialogElement.prototype.showModal = function () {
            this.open = true;
        };
        HTMLDialogElement.prototype.close = function () {
            this.open = false;
        };
        await useSocketStore().connect();
    });

    afterEach(() => {
        vi.useRealTimers();
        useSocketStore().disconnect();
    });

    const rowFor = (wrapper: ReturnType<typeof mount>, task: string) =>
        wrapper
            .findAll("table:not(dialog table) > tbody > tr")
            .find((row) => row.text().startsWith(task))!;

    it("shows the status badge from is_last_run_successful", async () => {
        const wrapper = mount(PeriodicTaskList);
        await vi.waitFor(() =>
            expect(wrapper.findAll("tbody tr")).toHaveLength(7),
        );

        const reminders = rowFor(wrapper, "Check reminders");
        expect(reminders.text()).toContain("Successful");
        expect(reminders.text()).toContain("Every minute");
        expect(reminders.text()).not.toContain("check-reminders");
        // Failed even though it succeeded before (0.9.w).
        const backup = rowFor(wrapper, "Back up the database");
        expect(backup.text()).toContain("Failed");
        expect(backup.text()).toContain("S3 offsite: AccessDenied");
        expect(rowFor(wrapper, "Empty the recycle bin").text()).toContain(
            "No runs yet",
        );
    });

    it("refreshes every 10 seconds until unmounted", async () => {
        vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
        const wrapper = mount(PeriodicTaskList);
        await vi.waitFor(() =>
            expect(wrapper.findAll("tbody tr")).toHaveLength(7),
        );

        mockControl.state.periodicTasks[5]!.last_fail_reason = "Disk full";
        vi.advanceTimersByTime(10_000);
        await flushPromises();
        await vi.waitFor(() => expect(wrapper.text()).toContain("Disk full"));

        const requests = () =>
            mockControl.log.filter(
                (entry) =>
                    entry.direction === "out" &&
                    entry.message.type === "getPeriodicTasks",
            ).length;
        const before = requests();
        wrapper.unmount();
        vi.advanceTimersByTime(30_000);
        expect(requests()).toBe(before);
    });

    const signInAs = (role: Role) =>
        useUserStore().setSession({
            user: { ...mockControl.state.currentUser, role },
            permissions: [...roleDefinitions[role].permissions],
            required_steps: [],
        });

    it("runs a task now for those who may", async () => {
        signInAs("admin");
        const wrapper = mount(PeriodicTaskList);
        await vi.waitFor(() =>
            expect(wrapper.findAll("tbody tr")).toHaveLength(7),
        );

        await rowFor(wrapper, "Back up the database")
            .get('button[title="Run now"]')
            .trigger("click");
        await vi.waitFor(() =>
            expect(useToastStore().messages.at(-1)?.text).toBe(
                "Back up the database will run in a moment.",
            ),
        );
        const backup = mockControl.state.periodicTasks.find(
            (task) => task.task_identifier === "backup-database",
        )!;
        expect(backup.next_run_at).toBeLessThanOrEqual(
            Math.floor(Date.now() / 1000) + 1,
        );
        wrapper.unmount();

        signInAs("user");
        const userView = mount(PeriodicTaskList);
        await vi.waitFor(() =>
            expect(userView.findAll("tbody tr")).toHaveLength(7),
        );
        expect(userView.find('button[title="Run now"]').exists()).toBe(false);
    });

    it("shows a task's runs when its view icon is clicked", async () => {
        const wrapper = mount(PeriodicTaskList, { attachTo: document.body });
        await vi.waitFor(() =>
            expect(wrapper.findAll("tbody tr")).toHaveLength(7),
        );
        expect(wrapper.find("dialog").exists()).toBe(false);

        await rowFor(wrapper, "Back up the database")
            .get('button[title="View runs"]')
            .trigger("click");
        const dialog = () => wrapper.get("dialog");
        await vi.waitFor(() =>
            expect(dialog().findAll("tbody tr")).toHaveLength(20),
        );
        expect(dialog().text()).toContain("Back up the database");
        expect(dialog().text()).toContain("25 runs in the last 30 days");

        const failedButton = dialog()
            .findAll("button")
            .find((b) => b.text() === "Failed")!;
        await failedButton.trigger("click");
        await vi.waitFor(() =>
            expect(dialog().findAll("tbody tr")).toHaveLength(1),
        );
        expect(dialog().get("tbody").text()).toContain(
            "S3 offsite: AccessDenied",
        );
        expect(dialog().text()).toContain("1 run in the last 30 days");

        await dialog().get('button[title="Close"]').trigger("click");
        expect(wrapper.find("dialog").exists()).toBe(false);
        wrapper.unmount();
    });
});
