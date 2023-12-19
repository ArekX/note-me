import { BusEvent, EventHandler } from "$backend/event-bus/event-bus.ts";
import { createNotification } from "$repository";
import { eventBus } from "$backend/event-bus/mod.ts";

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
  async handle(event: NoteReminderEvent): Promise<void> {
    const result = await createNotification({
      data: {
        type: "reminder-received",
        payload: {
          noteId: 1,
        },
      },
      user_id: 1,
    });

    eventBus.emit({
      type: "notification-received",
      payload: {
        toUserId: 1,
        data: result,
      },
    });

    console.log("Note reminder received", event.payload);
  },
};
