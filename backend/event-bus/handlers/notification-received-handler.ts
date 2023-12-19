import { BusEvent, EventHandler } from "$backend/event-bus/event-bus.ts";
import { backgroundServices } from "../../../workers/mod.ts";
import { NotificationMessages } from "../../../workers/websocket-handlers/notifications.ts";

export type NotificationReceivedEvent = BusEvent<
  "notification-received",
  NotificationMessages
>;

export const notificationReceivedHandler: EventHandler = {
  eventTypes: ["notification-received"],
  handle(event: NotificationReceivedEvent): void {
    backgroundServices.services.websocketServer.send({
      type: "notification",
      data: event.payload,
    });
  },
};
