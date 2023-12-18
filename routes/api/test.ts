import { FreshContext } from "$fresh/server.ts";
import { backgroundServices } from "../../workers/mod.ts";

export const handler = (_req: Request, _ctx: FreshContext): Response => {
  backgroundServices.services.websocketServer.send({
    type: "notification",
    data: {
      toUserId: 1,
      message: "Hello from the API!",
    },
  });
  return new Response("ok");
};
