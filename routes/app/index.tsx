import { FreshContext, Handlers } from "$fresh/server.ts";
import { AppState } from "$types";

export const handler: Handlers<string> = {
  GET(_req, _ctx: FreshContext<AppState>) {
    return new Response("", {
      status: 302,
      headers: { Location: "/app/note" },
    });
  },
};
