import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";
import {
    deleteSingleNotification,
    deleteUserNotifications,
    getUserNotifications,
    markReadUserNotifications,
    markSingleNotificationRead,
} from "$backend/repository/notification-repository.ts";
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

const getMyNotifications: ListenerFn<GetMyNotificationsMessage> = async (
    { sourceClient, respond },
) => {
    const { userId } = sourceClient!;

    respond<NotificationListResponse>({
        type: "notificationsList",
        records: await getUserNotifications(userId),
    });
};

const deleteAll: ListenerFn<DeleteAllMessage> = async (
    { sourceClient, respond },
) => {
    const { userId } = sourceClient!;
    await deleteUserNotifications(userId);
    respond<DeletedAllResponse>({
        type: "deletedAll",
    });
};

const markAllRead: ListenerFn<MarkAllReadMessage> = async (
    { sourceClient, respond },
) => {
    const { userId } = sourceClient!;
    await markReadUserNotifications(userId);
    respond<MarkedAllReadResponse>({
        type: "markedAllRead",
    });
};

const markSingleRead: ListenerFn<MarkSingleReadMessage> = async ({
    message,
    sourceClient,
    respond,
}) => {
    const { userId } = sourceClient!;
    await markSingleNotificationRead(message.id, userId);
    respond<MarkedSingleReadResponse>({
        type: "markedSingleRead",
        id: message.id,
    });
};

const deleteSingle: ListenerFn<DeleteSingleMessage> = async ({
    message,
    sourceClient,
    respond,
}) => {
    const { userId } = sourceClient!;
    await deleteSingleNotification(message.id, userId);
    respond<DeletedSingleResponse>({
        type: "deletedSingle",
        id: message.id,
    });
};

export const frontendMap: RegisterListenerMap<NotificationFrontendMessage> = {
    getMyNotifications,
    deleteAll,
    markAllRead,
    markSingleRead,
    deleteSingle,
};
