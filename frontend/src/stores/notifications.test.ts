import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockControl } from "@/test/mock-backend";
import type {
    DeletedAllResponse,
    DeletedSingleResponse,
    MarkedAllReadResponse,
    MarkedSingleReadResponse,
    NotificationAddedResponse,
} from "@/types/messages";
import type { NotificationRecord } from "@/types/records";
import { useNotificationsStore } from "./notifications";
import { useSocketStore } from "./socket";
import { useToastStore } from "./toast";

const reminder = (id: number): NotificationRecord => ({
    id,
    user_id: 1,
    created_at: 100,
    is_read: false,
    data: {
        type: "reminder-received",
        payload: {
            id: 3,
            reminder_id: 1,
            title: "Book list",
            is_encrypted: false,
            user_id: 1,
            user_name: "Administrator",
            type: "own",
        },
    },
});

const shown: { title: string; options: NotificationOptions }[] = [];

describe("notifications store", () => {
    beforeEach(async () => {
        shown.length = 0;
        vi.stubGlobal(
            "Notification",
            class {
                static permission = "granted";
                static requestPermission = vi.fn();
                onclick: (() => void) | null = null;
                constructor(title: string, options: NotificationOptions) {
                    shown.push({ title, options });
                }
                close() {}
            },
        );
        await useSocketStore().connect();
    });

    afterEach(() => {
        useSocketStore().disconnect();
        vi.unstubAllGlobals();
    });

    it("adds a pushed notification with a toast and a system notification", async () => {
        const store = useNotificationsStore();
        await store.load();
        const before = store.notifications.length;

        mockControl.push<NotificationAddedResponse>(
            "notifications",
            "notificationAdded",
            { record: reminder(500) },
        );

        await vi.waitFor(() => expect(store.notifications[0]?.id).toBe(500));
        expect(store.notifications).toHaveLength(before + 1);
        expect(store.unreadCount).toBeGreaterThan(0);
        expect(useToastStore().messages.at(-1)?.text).toBe(
            'You have a reminder for note "Book list" from Administrator',
        );
        expect(shown).toEqual([
            {
                title: "Reminder",
                options: {
                    body: 'You have a reminder for note "Book list" from Administrator',
                    icon: "/noteme.png",
                    silent: false,
                },
            },
        ]);
    });

    it("marks, deletes and stops listening after reset", async () => {
        const store = useNotificationsStore();
        await store.load();
        const [first] = store.notifications;

        await store.markRead(first!.id);
        expect(store.notifications[0]!.is_read).toBe(true);
        await store.remove(first!.id);
        expect(store.notifications.some((n) => n.id === first!.id)).toBe(false);
        await store.markAllRead();
        expect(store.unreadCount).toBe(0);

        store.reset();
        expect(store.notifications).toEqual([]);
        mockControl.push<NotificationAddedResponse>(
            "notifications",
            "notificationAdded",
            { record: reminder(600) },
        );
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(store.notifications).toEqual([]);
    });

    it("follows changes made in another tab", async () => {
        const store = useNotificationsStore();
        await store.load();
        const [first, second] = store.notifications;

        mockControl.push<MarkedSingleReadResponse>(
            "notifications",
            "markedSingleRead",
            { id: first!.id },
        );
        await vi.waitFor(() =>
            expect(store.notifications[0]!.is_read).toBe(true),
        );
        mockControl.push<DeletedSingleResponse>(
            "notifications",
            "deletedSingle",
            { id: first!.id },
        );
        await vi.waitFor(() =>
            expect(store.notifications.map((n) => n.id)).not.toContain(
                first!.id,
            ),
        );
        mockControl.push<MarkedAllReadResponse>(
            "notifications",
            "markedAllRead",
        );
        await vi.waitFor(() => expect(store.unreadCount).toBe(0));
        expect(store.notifications.map((n) => n.id)).toContain(second!.id);
        mockControl.push<DeletedAllResponse>("notifications", "deletedAll");
        await vi.waitFor(() => expect(store.notifications).toEqual([]));
        store.reset();
    });
});
