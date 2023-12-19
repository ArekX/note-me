import { FreshContext } from "$fresh/server.ts";
import { eventBus } from "$backend/event-bus/mod.ts";
import { createNotification } from "../../repository/notification-repository.ts";

export const handler = async (
  _req: Request,
  _ctx: FreshContext,
): Promise<Response> => {
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

  return new Response("ok");
};
