import { BusEvent, EventHandler } from "$backend/event-bus/event-bus.ts";

export type NoteReminderEvent = BusEvent<
  "note-reminder-received",
  NoteReminderReceived
>;

export interface NoteReminderReceived {
  noteId: number;
  remindUserIds: number[];
}

export const noteReminderHandler: EventHandler = {
  eventTypes: ["note-reminder-received"],
  handle(event: NoteReminderEvent): void {
    console.log("Note reminder received", event.payload);
  },
};
