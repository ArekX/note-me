import { useSignal } from "@preact/signals";
import Icon from "$components/Icon.tsx";
import { useScriptsReadyEffect } from "../../frontend/hooks/use-scripts-ready.ts";

import { NotificationRecord } from "$backend/repository/notification-repository.ts";
import { createRef } from "preact";
import NotificationItem from "$islands/notifications/NotificationItem.tsx";
import Button from "$components/Button.tsx";
import { useSinglePopover } from "$frontend/hooks/use-single-popover.ts";
import { useWebsocketService } from "../../frontend/hooks/use-websocket-service.ts";
import {
    DeleteAllMessage,
    DeleteSingleMessage,
    GetMyNotificationsMessage,
    MarkAllReadMessage,
    MarkSingleReadMessage,
    NotificationFrontendResponse,
} from "$workers/websocket/api/notifications/messages.ts";
import { addMessage } from "$frontend/toast-message.ts";
import { getNotificationMessageText } from "$islands/notifications/notification-message-text.ts";

interface NotificationsProps {
    initialNotifications: NotificationRecord[];
}

export default function Notifications(props: NotificationsProps) {
    const notifications = useSignal<NotificationRecord[]>(
        props.initialNotifications,
    );

    const { dispatchMessage } = useWebsocketService<
        NotificationFrontendResponse
    >({
        eventMap: {
            notifications: {
                notificationsList: (data): void => {
                    notifications.value = data.records;
                },
                deletedAll: (): void => {
                    notifications.value = [];
                },
                markedAllRead: (): void => {
                    notifications.value = notifications.value.map((
                        notification,
                    ) => ({
                        ...notification,
                        is_read: true,
                    }));
                },
                markedSingleRead: (data): void => {
                    notifications.value = notifications.value.map(
                        (notification) => {
                            if (notification.id === data.id) {
                                return {
                                    ...notification,
                                    is_read: true,
                                };
                            }
                            return notification;
                        },
                    );
                },
                deletedSingle: (data): void => {
                    notifications.value = notifications.value.filter((n) =>
                        n.id !== data.id
                    );
                },
                notificationAdded: (data): void => {
                    notifications.value = [
                        ...notifications.value,
                        data.record,
                    ];

                    addMessage({
                        type: "info",
                        text: getNotificationMessageText(data.record),
                    });
                },
            },
        },
    });

    useScriptsReadyEffect(() => {
        dispatchMessage<GetMyNotificationsMessage>(
            "notifications",
            "getMyNotifications",
        );
    });

    const handleDeleteSingle = (notification: NotificationRecord) =>
        dispatchMessage<DeleteSingleMessage>("notifications", "deleteSingle", {
            id: notification.id,
        });

    const handleDeleteAll = () =>
        dispatchMessage<DeleteAllMessage>("notifications", "deleteAll");

    const handleMarkAllRead = () =>
        dispatchMessage<MarkAllReadMessage>("notifications", "markAllRead");

    const handleMarkSingleAsRead = (notification: NotificationRecord) =>
        dispatchMessage<MarkSingleReadMessage>(
            "notifications",
            "markSingleRead",
            {
                id: notification.id,
            },
        );

    const menuRef = createRef<HTMLDivElement>();

    const { isOpen, open } = useSinglePopover("userNotifications-0", menuRef);

    const unreadCount = notifications.value.filter((s) => !s.is_read).length;

    return (
        <div
            class="text-right pl-1 pr-1 -mb-6 inline-block relative notification-menu"
            title="Notifications"
        >
            {unreadCount > 0 && (
                <span
                    class="notification-badge cursor-pointer"
                    onClick={open}
                >
                    {unreadCount > 9 ? "9+" : unreadCount}
                </span>
            )}
            <Icon
                name="bell"
                className="cursor-pointer"
                onClick={open}
                type={unreadCount > 0 ? "solid" : "regular"}
            />

            {isOpen && (
                <div
                    ref={menuRef}
                    class="absolute top-full left-0 w-96 bg-gray-800 pt-2 z-50 shadow-gray-900 shadow-md text-white text-left"
                >
                    <div class="pr-2 pb-1">
                        <div className="flex">
                            <div class="text-lg w-2/4 pl-4 pt-2">
                                {notifications.value.length > 0
                                    ? "Notifications "
                                    : ""}
                                {unreadCount > 0 && `(${unreadCount})`}
                            </div>
                            <div class="w-2/4 text-right">
                                {unreadCount > 0 && (
                                    <>
                                        <Button
                                            color="success"
                                            size="sm"
                                            title="Mark all as read"
                                            onClick={handleMarkAllRead}
                                        >
                                            <Icon name="check-double" />
                                        </Button>
                                        {" "}
                                    </>
                                )}
                                {notifications.value.length > 0 && (
                                    <Button
                                        color="danger"
                                        disabled={notifications.value.length ==
                                            0}
                                        size="sm"
                                        title="Delete all notifications"
                                        onClick={handleDeleteAll}
                                    >
                                        <Icon name="minus-circle" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                    {notifications.value.length > 0 && (
                        <div class="overflow-auto max-h-52">
                            {notifications.value.map((notification) => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    onDelete={handleDeleteSingle}
                                    onMarkRead={handleMarkSingleAsRead}
                                />
                            ))}
                        </div>
                    )}
                    {notifications.value.length === 0 && (
                        <div class="pr-4 pl-4 pb-4 text-center">
                            <div>
                                <Icon name="smile" size="5xl" />
                            </div>
                            No notifications. All clear!
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
