import { NotificationRecord } from "$backend/repository/notification-repository.ts";
import ReminderView from "$islands/notifications/views/ReminderView.tsx";
import { JSX } from "preact/jsx-runtime";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import NotificationSharedView from "$islands/notifications/views/NotificationSharedView.tsx";
import TimeAgo from "$components/TimeAgo.tsx";

export interface NotificationViewProps<T> {
    data: T;
    record: NotificationRecord;
}

interface NotificationItemProps {
    notification: NotificationRecord;
    onMarkRead: (notification: NotificationRecord) => void;
    onDelete: (notification: NotificationRecord) => void;
}

type NotificationViewMap = {
    [K in NotificationRecord["data"]["type"]]: (
        props: NotificationViewProps<
            Extract<NotificationRecord["data"], { type: K }>["payload"]
        >,
    ) => JSX.Element;
};

const notificationViewComponents: NotificationViewMap = {
    "reminder-received": ReminderView,
    "note-shared": NotificationSharedView,
};

export default function NotificationItem({
    notification,
    onDelete,
    onMarkRead,
}: NotificationItemProps) {
    const { data } = notification;

    const NotificationView = notificationViewComponents[data.type];

    if (!NotificationView) {
        return <h1>Component not defined for type: {data.type}</h1>;
    }

    const isReadClass = notification.is_read ? "" : "bg-gray-700/40";

    return (
        <div
            class={`${isReadClass} flex last:border-b-0 border-b border-gray-700`}
        >
            <div class="w-4/6">
                <NotificationView
                    data={data
                        // deno-lint-ignore no-explicit-any
                        .payload as any}
                    record={notification}
                />

                <div class="text-xs p-3">
                    <TimeAgo time={notification.created_at} />
                </div>
            </div>
            <div className="text-right pt-3 pr-2 w-2/6">
                {!notification.is_read && (
                    <>
                        <Button
                            size="xs"
                            onClick={() => onMarkRead(notification)}
                        >
                            <Icon name="check" />
                        </Button>
                        {" "}
                    </>
                )}
                <Button
                    size="xs"
                    color="danger"
                    onClick={() => onDelete(notification)}
                >
                    <Icon name="minus-circle" />
                </Button>
            </div>
        </div>
    );
}
