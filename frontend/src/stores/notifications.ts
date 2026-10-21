import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type {
    DeleteAllMessage,
    DeleteSingleMessage,
    DeletedAllResponse,
    DeletedSingleResponse,
    GetMyNotificationsMessage,
    MarkAllReadMessage,
    MarkSingleReadMessage,
    MarkedAllReadResponse,
    MarkedSingleReadResponse,
    NotificationFrontendResponse,
    NotificationListResponse,
} from "@/types/messages";
import type { NotificationRecord } from "@/types/records";
import {
    getNotificationMessageText,
    getNotificationMessageTitle,
} from "@/lib/notification-text";
import { redirectTo } from "@/lib/redirect";
import { router } from "@/router";
import { useSocketStore } from "./socket";
import { useToastStore } from "./toast";

export const useNotificationsStore = defineStore("notifications", () => {
    const notifications = ref<NotificationRecord[]>([]);
    const isLoaded = ref(false);
    let unsubscribe: (() => void) | null = null;

    const unreadCount = computed(
        () => notifications.value.filter((n) => !n.is_read).length,
    );

    const add = (notification: NotificationRecord) => {
        notifications.value = [
            notification,
            ...notifications.value.filter((n) => n.id !== notification.id),
        ];
    };

    const canShowSystemNotification = () =>
        "Notification" in globalThis && Notification.permission === "granted";

    const requestSystemPermission = () => {
        if (
            "Notification" in globalThis &&
            Notification.permission === "default"
        ) {
            void Notification.requestPermission();
        }
    };

    const showSystemNotification = (record: NotificationRecord) => {
        const notification = new Notification(
            getNotificationMessageTitle(record),
            {
                body: getNotificationMessageText(record),
                icon: "/noteme.png",
                silent: false,
            },
        );
        notification.onclick = () => {
            globalThis.focus();
            notification.close();
            const { data } = record;
            const isOwn =
                data.type === "reminder-received" &&
                data.payload.type === "own";
            void router.push(
                isOwn
                    ? redirectTo.viewNote({ noteId: data.payload.id })
                    : redirectTo.viewSharedNote({ noteId: data.payload.id }),
            );
        };
    };

    const applyRead = (id: number) => {
        const record = notifications.value.find((n) => n.id === id);
        if (record) {
            record.is_read = true;
        }
    };
    const applyAllRead = () =>
        notifications.value.forEach((n) => (n.is_read = true));
    const applyRemoved = (id: number) => {
        notifications.value = notifications.value.filter((n) => n.id !== id);
    };
    const applyAllRemoved = () => {
        notifications.value = [];
    };

    const receive = (record: NotificationRecord) => {
        add(record);
        if (canShowSystemNotification()) {
            showSystemNotification(record);
        }
        useToastStore().addMessage({
            type: "info",
            text: getNotificationMessageText(record),
        });
    };

    const load = async (): Promise<void> => {
        const service = await useSocketStore().getService();

        unsubscribe ??= service.listen<NotificationFrontendResponse>({
            notifications: {
                notificationAdded: ({ record }) => receive(record),
                markedSingleRead: ({ id }) => applyRead(id),
                markedAllRead: applyAllRead,
                deletedSingle: ({ id }) => applyRemoved(id),
                deletedAll: applyAllRemoved,
            },
        });

        const response = await service.sendMessage<
            GetMyNotificationsMessage,
            NotificationListResponse
        >("notifications", "getMyNotifications", {
            expect: "notificationsList",
        });
        notifications.value = response.records;
        isLoaded.value = true;
        requestSystemPermission();
    };

    const reset = () => {
        unsubscribe?.();
        unsubscribe = null;
        notifications.value = [];
        isLoaded.value = false;
    };

    const markRead = async (id: number): Promise<void> => {
        const service = await useSocketStore().getService();
        await service.sendMessage<
            MarkSingleReadMessage,
            MarkedSingleReadResponse
        >("notifications", "markSingleRead", {
            data: { id },
            expect: "markedSingleRead",
        });
        applyRead(id);
    };

    const markAllRead = async (): Promise<void> => {
        const service = await useSocketStore().getService();
        await service.sendMessage<MarkAllReadMessage, MarkedAllReadResponse>(
            "notifications",
            "markAllRead",
            {
                expect: "markedAllRead",
            },
        );
        applyAllRead();
    };

    const remove = async (id: number): Promise<void> => {
        const service = await useSocketStore().getService();
        await service.sendMessage<DeleteSingleMessage, DeletedSingleResponse>(
            "notifications",
            "deleteSingle",
            {
                data: { id },
                expect: "deletedSingle",
            },
        );
        applyRemoved(id);
    };

    const removeAll = async (): Promise<void> => {
        const service = await useSocketStore().getService();
        await service.sendMessage<DeleteAllMessage, DeletedAllResponse>(
            "notifications",
            "deleteAll",
            {
                expect: "deletedAll",
            },
        );
        applyAllRemoved();
    };

    return {
        notifications,
        isLoaded,
        unreadCount,
        load,
        reset,
        add,
        markRead,
        markAllRead,
        remove,
        removeAll,
    };
});
