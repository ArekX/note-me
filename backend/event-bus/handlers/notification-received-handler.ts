import { BusEvent, EventHandler } from "$backend/event-bus/event-bus.ts";
import { services } from "$workers/services/mod.ts";
import { SendNotificationRequest } from "$workers/websocket/messages.ts";

export type NotificationReceivedEvent = BusEvent<
    "notification-received",
    SendNotificationRequest
>;

export const notificationReceivedHandler: EventHandler = {
    eventTypes: ["notification-received"],
    handle(event: NotificationReceivedEvent): void {
        services.websocket.send({
            type: "notification",
            payload: event.payload,
        });
    },
};
