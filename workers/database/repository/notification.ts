import { DbHandlerMap, DbRequest } from "$workers/database/message.ts";
import {
    createNotification,
    deleteSingleNotification,
    deleteUserNotifications,
    getUserNotifications,
    markReadUserNotifications,
    markSingleNotificationRead,
    NewNotification,
    NotificationRecord,
} from "../query/notification-repository.ts";

type NotificationRequest<Key extends string, Request, Response> = DbRequest<
    "notification",
    "repository",
    Key,
    Request,
    Response
>;

type GetUserNotifications = NotificationRequest<
    "getUserNotifications",
    number,
    NotificationRecord[]
>;
type CreateNotification = NotificationRequest<
    "createNotification",
    NewNotification,
    NotificationRecord
>;
type DeleteUserNotifications = NotificationRequest<
    "deleteUserNotifications",
    number,
    boolean
>;
type DeleteSingleNotification = NotificationRequest<
    "deleteSingleNotification",
    { id: number; userId: number },
    boolean
>;
type MarkReadUserNotifications = NotificationRequest<
    "markReadUserNotifications",
    number,
    boolean
>;
type MarkSingleNotificationRead = NotificationRequest<
    "markSingleNotificationRead",
    { id: number; userId: number },
    boolean
>;

export type NotificationRepository =
    | GetUserNotifications
    | CreateNotification
    | DeleteUserNotifications
    | DeleteSingleNotification
    | MarkReadUserNotifications
    | MarkSingleNotificationRead;

export const notification: DbHandlerMap<NotificationRepository> = {
    getUserNotifications,
    createNotification,
    deleteUserNotifications,
    deleteSingleNotification: ({ id, userId }) =>
        deleteSingleNotification(id, userId),
    markReadUserNotifications,
    markSingleNotificationRead: ({ id, userId }) =>
        markSingleNotificationRead(id, userId),
};
