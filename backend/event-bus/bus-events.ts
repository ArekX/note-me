import { NotificationReceivedEvent } from "$backend/event-bus/handlers/notification-received-handler.ts";
import { NoteReminderEvent } from "$backend/event-bus/handlers/note-reminder-handler.ts";

export type BusEvents =
  | NotificationReceivedEvent
  | NoteReminderEvent;
