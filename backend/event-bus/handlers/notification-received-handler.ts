import { BusEvent, EventHandler } from "$backend/event-bus/event-bus.ts";
import { backgroundServices } from "$backend/workers/mod.ts";
import { SendNotificationRequest } from "$backend/workers/websocket-handlers/notifications.ts";

export type NotificationReceivedEvent = BusEvent<
    "notification-received",
    SendNotificationRequest
>;

export const notificationReceivedHandler: EventHandler = {
    eventTypes: ["notification-received"],
    handle(event: NotificationReceivedEvent): void {
        backgroundServices.services.websocketService.send({
            type: "notification",
            payload: event.payload,
        });
    },
};
