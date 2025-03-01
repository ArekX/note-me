import { useSignal } from "@preact/signals";
import Icon from "$components/Icon.tsx";

import { NotificationRecord } from "$db";
import { createRef } from "preact";
import { useSinglePopover } from "$frontend/hooks/use-single-popover.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
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
import { useEffect } from "preact/hooks";
import { useResponsiveQuery } from "$frontend/hooks/use-responsive-query.ts";
import NotificationListView from "$islands/notifications/NotificationListView.tsx";
import Dialog from "$islands/Dialog.tsx";
import Button from "$components/Button.tsx";
import { useWindowResize } from "$frontend/hooks/use-window-resize.ts";

interface NotificationsProps {
    initialNotifications: NotificationRecord[];
}

export default function Notifications(props: NotificationsProps) {
    const notifications = useSignal<NotificationRecord[]>(
        props.initialNotifications,
    );
    const query = useResponsiveQuery();

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
                        data.record,
                        ...notifications.value,
                    ];

                    addMessage({
                        type: "info",
                        text: getNotificationMessageText(data.record),
                    });
                },
            },
        },
    });

    useEffect(() => {
        dispatchMessage<GetMyNotificationsMessage>(
            "notifications",
            "getMyNotifications",
        );
    }, []);

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

    const handleOpenView = () => {
        if (query.isMobile()) {
            isDialogOpen.value = true;
            return;
        }
        open();
    };

    const menuIconRef = createRef<HTMLSpanElement>();
    const menuRef = createRef<HTMLDivElement>();

    const isDialogOpen = useSignal(false);

    const { isOpen, open } = useSinglePopover("userNotifications-0", menuRef);

    const updateNotificationPanelPosition = () => {
        if (menuRef.current) {
            const el = menuRef.current;

            const rect = menuIconRef.current!.getBoundingClientRect();

            el.style.top = `${rect.bottom}px`;
            el.style.left = `${rect.left}px`;
            el.style.display = "block";
            el.style.bottom = "20vh";
        }
    };

    useEffect(updateNotificationPanelPosition, [menuRef]);

    useWindowResize(menuRef, updateNotificationPanelPosition);

    const unreadCount = notifications.value.filter((s) => !s.is_read).length;

    return (
        <div
            class="text-right max-md:text-left pl-1 max-md:pl-5 pr-1 -mb-6 max-md:mb-0 inline-block max-md:block relative notification-menu"
            title="Notifications"
        >
            <span
                ref={menuIconRef}
                className="cursor-pointer relative"
                onClick={handleOpenView}
            >
                {unreadCount > 0 && (
                    <span class="notification-badge cursor-pointer">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
                <Icon
                    name="bell"
                    type={unreadCount > 0 ? "solid" : "regular"}
                />{" "}
                <span class="max-md:inline-block hidden">
                    Notifications
                </span>
            </span>

            {query.min("md") && isOpen
                ? (
                    <div
                        ref={menuRef}
                        class="notification-container hidden fixed top-10 left-0 w-96 bg-gray-800 pt-2 z-50 shadow-black/80 shadow-sm text-white text-left rounded-lg border border-b-0 border-gray-600/50"
                    >
                        <NotificationListView
                            notifications={notifications.value}
                            onMarkAllRead={handleMarkAllRead}
                            onMarkSingleAsRead={handleMarkSingleAsRead}
                            onDeleteAll={handleDeleteAll}
                            onDeleteSingle={handleDeleteSingle}
                        />
                    </div>
                )
                : query.isMobile() && isDialogOpen.value && (
                    <Dialog
                        visible
                        props={{
                            class: "w-full p-0 py-2",
                        }}
                    >
                        <NotificationListView
                            notifications={notifications.value}
                            onMarkAllRead={handleMarkAllRead}
                            onMarkSingleAsRead={handleMarkSingleAsRead}
                            onDeleteAll={handleDeleteAll}
                            onDeleteSingle={handleDeleteSingle}
                        />
                        <div class="pt-2 text-right pr-2">
                            <Button
                                color="primary"
                                onClick={() => isDialogOpen.value = false}
                            >
                                Close
                            </Button>
                        </div>
                    </Dialog>
                )}
        </div>
    );
}
