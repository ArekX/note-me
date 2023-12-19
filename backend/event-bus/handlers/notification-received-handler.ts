import { BusEvent, EventHandler } from "$backend/event-bus/event-bus.ts";
import { backgroundServices } from "../../../workers/mod.ts";
import { SendNotificationRequest } from "../../../workers/websocket-handlers/notifications.ts";

export type NotificationReceivedEvent = BusEvent<
  "notification-received",
  SendNotificationRequest
>;

export const notificationReceivedHandler: EventHandler = {
  eventTypes: ["notification-received"],
  handle(event: NotificationReceivedEvent): void {
    backgroundServices.services.websocketServer.send({
      type: "notification",
      payload: event.payload,
    });
  },
};
