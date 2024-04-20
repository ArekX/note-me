import { NotificationRecord } from "$backend/repository/notification-repository.ts";
import { Message } from "$workers/websocket/types.ts";

type NotificationMessage<Type, Data = unknown> = Message<
    "notifications",
    Type,
    Data
>;

export type GetMyNotificationsMessage = NotificationMessage<
    "getMyNotifications"
>;

export type DeleteAllMessage = NotificationMessage<"deleteAll">;

export type MarkAllReadMessage = NotificationMessage<
    "markAllRead"
>;

export type MarkSingleReadMessage = NotificationMessage<
    "markSingleRead",
    { id: number }
>;

export type DeleteSingleMessage = NotificationMessage<
    "deleteSingle",
    { id: number }
>;

export type NotificationFrontendMessage =
    | GetMyNotificationsMessage
    | DeleteAllMessage
    | DeleteSingleMessage
    | MarkAllReadMessage
    | MarkSingleReadMessage
    | DeleteAllMessage;

export type NotificationListResponse = NotificationMessage<
    "notificationsList",
    { records: NotificationRecord[] }
>;
export type NotificationAddedResponse = NotificationMessage<
    "notificationAdded",
    { record: NotificationRecord }
>;
export type DeletedAllResponse = NotificationMessage<"deletedAll">;
export type MarkedAllReadResponse = NotificationMessage<"markedAllRead">;
export type MarkedSingleReadResponse = NotificationMessage<
    "markedSingleRead",
    { id: number }
>;
export type DeletedSingleResponse = NotificationMessage<
    "deletedSingle",
    { id: number }
>;

export type NotificationFrontendResponse =
    | NotificationListResponse
    | NotificationAddedResponse
    | DeletedAllResponse
    | MarkedAllReadResponse
    | MarkedSingleReadResponse
    | DeletedSingleResponse;

export type AddNotificationMessage = NotificationMessage<"addNotification", {
    toUserId: number;
    data: NotificationRecord;
}>;

export type NotificationBackendMessage = AddNotificationMessage;
