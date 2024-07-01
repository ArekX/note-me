import {
    createNotification,
    NotificationDataTypes,
} from "$backend/repository/notification-repository.ts";
import { websocketService } from "$workers/websocket/websocket-service.ts";
import { NotificationAddedResponse } from "$workers/websocket/api/notifications/messages.ts";

export const runSendNotificationAction = async (
    notification: NotificationDataTypes,
    user_id: number,
): Promise<void> => {
    const record = await createNotification({
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
