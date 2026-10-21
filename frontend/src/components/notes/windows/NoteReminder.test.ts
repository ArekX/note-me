import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { useSocketStore } from "@/stores/socket";
import NoteReminder from "./NoteReminder.vue";

const clickButton = async (wrapper: VueWrapper, text: string) => {
    await wrapper
        .findAll("button")
        .find((b) => b.text() === text)!
        .trigger("click");
    await flushPromises();
};

const reminderFor = (noteId: number) =>
    mockControl.state.reminders.find((r) => r.note_id === noteId);

const mountWindow = async (noteId: number) => {
    const wrapper = mount(NoteReminder, {
        props: { noteId },
        attachTo: document.body,
    });
    await vi.waitFor(() =>
        expect(wrapper.find('[aria-busy="true"]').exists()).toBe(false),
    );
    return wrapper;
};

describe("NoteReminder", () => {
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
        useSocketStore().disconnect();
        document.body.innerHTML = "";
    });

    it("sets a reminder from a quick pick", async () => {
        const wrapper = await mountWindow(3);
        expect(wrapper.text()).toContain("No reminder set.");

        await clickButton(wrapper, "Set reminder");
        const before = Math.floor(Date.now() / 1000);
        await clickButton(wrapper, "In 1 hour");

        await vi.waitFor(() =>
            expect(wrapper.emitted("close")).toHaveLength(1),
        );
        const reminder = reminderFor(3)!;
        expect(reminder.interval).toBeNull();
        expect(reminder.next_at % 60).toBe(0);
        expect(reminder.next_at).toBeGreaterThan(before + 3600 - 120);
    });

    it("loads and saves a repeating reminder", async () => {
        const wrapper = await mountWindow(2);
        expect(wrapper.find('input[type="number"]').element).toBeDefined();

        const [every, times] = wrapper.findAll('input[type="number"]');
        await every!.setValue("2");
        await times!.setValue("4");
        await clickButton(wrapper, "Save");

        await vi.waitFor(() =>
            expect(wrapper.emitted("close")).toHaveLength(1),
        );
        expect(reminderFor(2)).toMatchObject({
            interval: 2,
            unit_value: 86400,
            repeat_count: 4,
            done_count: 1,
        });
    });

    it("keeps the window open for a past date", async () => {
        const wrapper = await mountWindow(1);
        await wrapper.get('input[type="date"]').setValue("2000-01-01");
        expect(wrapper.text()).toContain("Reminder date is in the past.");

        await clickButton(wrapper, "Save");
        expect(wrapper.emitted("close")).toBeUndefined();
    });

    it("removes a reminder", async () => {
        const wrapper = await mountWindow(1);
        await clickButton(wrapper, "Remove Reminder");

        await vi.waitFor(() =>
            expect(wrapper.emitted("close")).toHaveLength(1),
        );
        expect(reminderFor(1)).toBeUndefined();
    });
});
