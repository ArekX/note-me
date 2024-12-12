import { NotificationDataTypes } from "../../workers/database/query/notification-repository.ts";
import { websocketService } from "$workers/websocket/websocket-service.ts";
import { NotificationAddedResponse } from "$workers/websocket/api/notifications/messages.ts";
import { repository } from "$workers/database/lib.ts";

export const runSendNotificationAction = async (
    notification: NotificationDataTypes,
    user_id: number,
): Promise<void> => {
    const record = await repository.notification.createNotification({
        data: notification,
        user_id,
    });

    websocketService.getClientByUserId(user_id)?.send<
        NotificationAddedResponse
    >({
        namespace: "notifications",
        requestId: crypto.randomUUID(),
        type: "notificationAdded",
        record,
    });
};
