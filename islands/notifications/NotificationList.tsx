import { useSignal } from "@preact/signals";
import { Icon } from "$components/Icon.tsx";
import { socketManager } from "$frontend/socket-manager.ts";
import { useScriptsReadyEffect } from "../../frontend/hooks/use-scripts-ready.ts";
import {
    ClientNotificationRequests,
    NotificationResponses,
} from "$backend/workers/websocket-handlers/notifications.ts";
import { NotificationRecord } from "$backend/repository/notification-repository.ts";
import { useCallback, useEffect, useMemo } from "preact/hooks";
import { createRef } from "preact";
import { NotificationItem } from "$islands/notifications/NotificationItem.tsx";

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
            }
        });

        socketManager.send<ClientNotificationRequests>({
            type: "getMyNotifications",
            payload: null,
        });
    });

    const visible = useSignal(false);

    const menuRef = createRef<HTMLDivElement>();

    useEffect(() => {
        if (!menuRef.current) {
            return;
        }

        const handleDocumentClick = (event: Event) => {
            if (!menuRef.current!) {
                visible.value = false;
                return;
            }
            if (menuRef.current.contains(event.target as Node)) {
                return;
            }

            visible.value = false;
        };

        document.body.addEventListener("click", handleDocumentClick);

        return () => {
            document.body.removeEventListener("click", handleDocumentClick);
        };
    }, [menuRef]);

    return (
        <div
            class="text-right pl-1 pr-1 -mb-6 inline-block relative notification-menu"
            title="Notifications"
        >
            {notifications.value.length > 0 && (
                <span class="notification-badge">
                    {notifications.value.length}
                </span>
            )}
            <Icon
                name="bell"
                className="cursor-pointer"
                onClick={() => visible.value = !visible.value}
                type={notifications.value.length > 0 ? "solid" : "regular"}
            />

            {visible.value && (
                <div
                    ref={menuRef}
                    class="absolute top-full left-0 w-96 bg-gray-800 p-4 z-50 shadow-xl text-white text-left"
                >
                    {notifications.value.map((notification) => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                        />
                    ))}
                    {notifications.value.length === 0 && (
                        <div>
                            No notifications here!
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
