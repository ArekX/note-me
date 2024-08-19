import { NotificationRecord } from "$backend/repository/notification-repository.ts";
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
                <>
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
                    <div class="notifcation-list">
                        {notifications.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onDelete={onDeleteSingle}
                                onMarkRead={onMarkSingleAsRead}
                            />
                        ))}
                    </div>
                </>
            )}
            {notifications.length === 0 && (
                <div class="py-4">
                    <NoItemMessage
                        icon="smile"
                        removePadding={true}
                        message="No notifications. All clear!"
                    />
                </div>
            )}
        </>
    );
}