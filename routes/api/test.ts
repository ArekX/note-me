import { FreshContext } from "$fresh/server.ts";
import { webSocketBackgroundService } from "../../workers/mod.ts";
import { NotificationMessages } from "../../workers/websocket-handlers/notifications.ts";

export const handler = (_req: Request, _ctx: FreshContext): Response => {
  webSocketBackgroundService.send<NotificationMessages>({
    toUserId: 1,
    message: "Hello from the API!",
  });
  return new Response("ok");
};
