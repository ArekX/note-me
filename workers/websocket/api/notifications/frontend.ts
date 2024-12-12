import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";
import {
    DeleteAllMessage,
    DeletedAllResponse,
    DeletedSingleResponse,
    DeleteSingleMessage,
    GetMyNotificationsMessage,
    MarkAllReadMessage,
    MarkedAllReadResponse,
    MarkedSingleReadResponse,
    MarkSingleReadMessage,
    NotificationFrontendMessage,
    NotificationListResponse,
} from "./messages.ts";
import { repository } from "$workers/database/lib.ts";

const handleGetMyNotifications: ListenerFn<GetMyNotificationsMessage> = async (
    { sourceClient, respond },
) => {
    const { userId } = sourceClient!;

    respond<NotificationListResponse>({
        type: "notificationsList",
        records: await repository.notification.getUserNotifications(userId),
    });
};

const handleDeleteAll: ListenerFn<DeleteAllMessage> = async (
    { sourceClient, respond },
) => {
    const { userId } = sourceClient!;
    await repository.notification.deleteUserNotifications(userId);
    respond<DeletedAllResponse>({
        type: "deletedAll",
    });
};

const handleMarkAllRead: ListenerFn<MarkAllReadMessage> = async (
    { sourceClient, respond },
) => {
    const { userId } = sourceClient!;
    await repository.notification.markReadUserNotifications(userId);
    respond<MarkedAllReadResponse>({
        type: "markedAllRead",
    });
};

const handleMarkSingleRead: ListenerFn<MarkSingleReadMessage> = async ({
    message,
    sourceClient,
    respond,
}) => {
    const { userId } = sourceClient!;
    await repository.notification.markSingleNotificationRead({
        id: message.id,
        userId,
    });
    respond<MarkedSingleReadResponse>({
        type: "markedSingleRead",
        id: message.id,
    });
};

const handleDeleteSingle: ListenerFn<DeleteSingleMessage> = async ({
    message,
    sourceClient,
    respond,
}) => {
    const { userId } = sourceClient!;
    await repository.notification.deleteSingleNotification({
        id: message.id,
        userId,
    });

    respond<DeletedSingleResponse>({
        type: "deletedSingle",
        id: message.id,
    });
};

export const frontendMap: RegisterListenerMap<NotificationFrontendMessage> = {
    getMyNotifications: handleGetMyNotifications,
    deleteAll: handleDeleteAll,
    markAllRead: handleMarkAllRead,
    markSingleRead: handleMarkSingleRead,
    deleteSingle: handleDeleteSingle,
};
