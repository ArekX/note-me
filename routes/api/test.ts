import { FreshContext } from "$fresh/server.ts";
import { eventBus } from "$backend/event-bus/mod.ts";

export const handler = (_req: Request, _ctx: FreshContext): Response => {
  eventBus.emit({
    type: "notification-received",
    payload: {
      toUserId: 1,
      message: "Hello from the API!",
    },
  });

  return new Response("ok");
};
