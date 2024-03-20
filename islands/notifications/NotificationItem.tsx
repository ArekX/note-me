import { NotificationRecord } from "$backend/repository/notification-repository.ts";
import { ReminderView } from "$islands/notifications/views/ReminderView.tsx";
import { JSX } from "preact/jsx-runtime";

export interface NotificationViewProps<T> {
    data: T;
    record: NotificationRecord;
}

interface NotificationItemProps {
    notification: NotificationRecord;
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
};

export const NotificationItem = ({
    notification,
}: NotificationItemProps) => {
    const { data } = notification;

    const NotificationView = notificationViewComponents[data.type];

    if (!NotificationView) {
        return <h1>Component not defined for type: {data.type}</h1>;
    }

    return (
        <NotificationView
            data={data
                // deno-lint-ignore no-explicit-any
                .payload as any}
            record={notification}
        />
    );
};
