import { BusEvent, EventHandler } from "$backend/event-bus/event-bus.ts";
import { services } from "$workers/services/mod.ts";
import { NotificationRecord } from "$backend/repository/notification-repository.ts";
import { AddNotificationMessage } from "$workers/websocket/api/notifications/messages.ts";

export type NotificationReceivedEvent = BusEvent<
    "notification-received",
    { toUserId: number; data: NotificationRecord }
>;

export const notificationReceivedHandler: EventHandler = {
    eventTypes: ["notification-received"],
    handle(event: NotificationReceivedEvent): void {
        services.websocket.send<AddNotificationMessage>({
            namespace: "notifications",
            type: "addNotification",
            toUserId: event.payload.toUserId,
            data: event.payload.data,
        });
        console.log("sending!");
    },
};
