import { Payload } from "$types";
import { NotificationRecord } from "$backend/repository/notification-repository.ts";

export type SocketFrontendMessage = NotificationMessages;

export type SocketBackendMessage = Payload<
    "notification",
    SendNotificationRequest
>;

export interface SendNotificationRequest {
    toUserId: number;
    data: NotificationRecord;
}

export type NotificationMessages =
    | Payload<"getMyNotifications", null>
    | Payload<"deleteAll", null>
    | Payload<"markAllRead", null>
    | Payload<"markSingleRead", { id: number }>
    | Payload<"deleteSingle", { id: number }>;
