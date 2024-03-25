import { useSignal } from "@preact/signals";
import { Icon } from "$components/Icon.tsx";
import { socketManager } from "$frontend/socket-manager.ts";
import { useScriptsReadyEffect } from "../../frontend/hooks/use-scripts-ready.ts";
import {
    ClientNotificationRequests,
    NotificationResponses,
} from "$backend/workers/websocket-handlers/notifications.ts";
import { NotificationRecord } from "$backend/repository/notification-repository.ts";
import { useEffect } from "preact/hooks";
import { createRef } from "preact";
import { NotificationItem } from "$islands/notifications/NotificationItem.tsx";
import { Button } from "$components/Button.tsx";

interface NotificationsProps {
    initialNotifications: NotificationRecord[];
}

export default function Notifications(props: NotificationsProps) {
    const notifications = useSignal<NotificationRecord[]>(
        props.initialNotifications,
    );

    useScriptsReadyEffect(() => {
        socketManager.onMessage<NotificationResponses>((data) => {
            if (data.type == "notifications-list") {
                notifications.value = data.payload;
            } else if (data.type == "notification-added") {
                notifications.value = [...notifications.value, data.payload];
            } else if (data.type == "deleted-all") {
                notifications.value = [];
            } else if (data.type == "marked-all-read") {
                notifications.value = notifications.value.map((
                    notification,
                ) => ({
                    ...notification,
                    is_read: true,
                }));
            } else if (data.type == "marked-single-read") {
                notifications.value = notifications.value.map((
                    notification,
                ) => {
                    if (notification.id === data.payload.id) {
                        return {
                            ...notification,
                            is_read: true,
                        };
                    }
                    return notification;
                });
            } else if (data.type == "deleted-single") {
                notifications.value = notifications.value.filter((n) =>
                    n.id !== data.payload.id
                );
            }
        });

        socketManager.send<ClientNotificationRequests>({
            type: "getMyNotifications",
            payload: null,
        });
    });

    const handleDeleteSingle = (notification: NotificationRecord) => {
        socketManager.send<ClientNotificationRequests>({
            type: "deleteSingle",
            payload: { id: notification.id },
        });
    };

    const handleDeleteAll = () => {
        socketManager.send<ClientNotificationRequests>({
            type: "deleteAll",
            payload: null,
        });
    };

    const handleMarkAllRead = () => {
        socketManager.send<ClientNotificationRequests>({
            type: "markAllRead",
            payload: null,
        });
    };

    const handleMarkSingleAsRead = (notification: NotificationRecord) => {
        socketManager.send<ClientNotificationRequests>({
            type: "markSingleRead",
            payload: { id: notification.id },
        });
    };

    const isVisible = useSignal(false);

    const menuRef = createRef<HTMLDivElement>();

    useEffect(() => {
        if (!menuRef.current) {
            return;
        }

        const handleDocumentClick = (event: Event) => {
            if (!menuRef.current!) {
                isVisible.value = false;
                return;
            }
            if (menuRef.current.contains(event.target as Node)) {
                return;
            }

            isVisible.value = false;
        };

        document.body.addEventListener("click", handleDocumentClick);

        return () => {
            document.body.removeEventListener("click", handleDocumentClick);
        };
    }, [menuRef]);

    const unreadCount = notifications.value.filter((s) => !s.is_read).length;

    return (
        <div
            class="text-right pl-1 pr-1 -mb-6 inline-block relative notification-menu"
            title="Notifications"
        >
            {unreadCount > 0 && (
                <span
                    class="notification-badge cursor-pointer"
                    onClick={() => isVisible.value = !isVisible.value}
                >
                    {unreadCount > 9 ? "9+" : unreadCount}
                </span>
            )}
            <Icon
                name="bell"
                className="cursor-pointer"
                onClick={() => isVisible.value = !isVisible.value}
                type={unreadCount > 0 ? "solid" : "regular"}
            />

            {isVisible.value && (
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
