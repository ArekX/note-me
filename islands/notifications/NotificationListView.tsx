import { NotificationRecord } from "$db";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import NotificationItem from "$islands/notifications/NotificationItem.tsx";
import NoItemMessage from "$islands/sidebar/NoItemMessage.tsx";

interface NotificationItemProps {
    notifications: NotificationRecord[];
    onMarkAllRead: () => void;
    onMarkSingleAsRead: (record: NotificationRecord) => void;
    onDeleteAll: () => void;
    onDeleteSingle: (record: NotificationRecord) => void;
}

export default function NotificationListView(
    {
        notifications,
        onMarkAllRead,
        onMarkSingleAsRead,
        onDeleteAll,
        onDeleteSingle,
    }: NotificationItemProps,
) {
    const unreadCount = notifications.filter((s) => !s.is_read).length;

    return (
        <>
            {notifications.length > 0 && (
                <div class="flex flex-col items-stretch justify-start h-full max-notification-height">
                    <div class="pr-2 pb-2 border-b border-gray-700">
                        <div class="flex">
                            <div class="text-md max-md:text-left font-semibold w-2/4 pl-4 max-md:pl-2 pt-2">
                                {notifications.length > 0
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
                                            onClick={onMarkAllRead}
                                        >
                                            <Icon name="check-double" />
                                        </Button>
                                        {" "}
                                    </>
                                )}
                                {notifications.length > 0 && (
                                    <Button
                                        color="danger"
                                        disabled={notifications
                                            .length ==
                                            0}
                                        size="sm"
                                        title="Delete all notifications"
                                        onClick={onDeleteAll}
                                    >
                                        <Icon name="minus-circle" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                    <div class="flex-grow md:overflow-auto">
                        {notifications.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onDelete={onDeleteSingle}
                                onMarkRead={onMarkSingleAsRead}
                            />
                        ))}
                    </div>
                </div>
            )}
            {notifications.length === 0 && (
                <div class="h-full flex justify-center items-center">
                    <NoItemMessage
                        icon="smile"
                        removePadding
                        message="No notifications. All clear!"
                    />
                </div>
            )}
        </>
    );
}
