import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { useSocketStore } from "@/stores/socket";
import type { NotificationAddedResponse } from "@/types/messages";
import CurrentReminders from "./CurrentReminders.vue";

vi.mock("vue-router", () => ({
    useRoute: () => ({ name: "dashboard", params: {} }),
    useRouter: () => ({ push: vi.fn() }),
}));

describe("CurrentReminders", () => {
    beforeEach(async () => {
        await useSocketStore().connect();
    });

    afterEach(() => {
        useSocketStore().disconnect();
    });

    it("lists upcoming reminders and drops one when it fires", async () => {
        const wrapper = mount(CurrentReminders);
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain("NoteMe Go rewrite plan"),
        );
        expect(wrapper.text()).toContain("Weekly sync 2026-10-06");

        mockControl.push<NotificationAddedResponse>(
            "notifications",
            "notificationAdded",
            {
                record: {
                    id: 99,
                    user_id: 1,
                    created_at: 100,
                    is_read: false,
                    data: {
                        type: "reminder-received",
                        payload: {
                            id: 1,
                            reminder_id: 2,
                            title: "NoteMe Go rewrite plan",
                            is_encrypted: false,
                            user_id: 1,
                            user_name: "Administrator",
                            type: "own",
                        },
                    },
                },
            },
        );

        await vi.waitFor(() =>
            expect(wrapper.text()).not.toContain("NoteMe Go rewrite plan"),
        );
        expect(wrapper.text()).toContain("Weekly sync 2026-10-06");
    });
});
