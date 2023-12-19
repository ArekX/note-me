import { EventBus } from "$backend/event-bus/event-bus.ts";
import { notificationReceivedHandler } from "$backend/event-bus/handlers/notification-received-handler.ts";
import { noteReminderHandler } from "$backend/event-bus/handlers/note-reminder-handler.ts";

export const eventBus = new EventBus([
  notificationReceivedHandler,
  noteReminderHandler,
]);
