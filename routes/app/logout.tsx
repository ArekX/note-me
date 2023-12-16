import { FreshContext, Handlers, PageProps } from "$fresh/server.ts";
import { destroySession } from "$backend/session/mod.ts";
import { AppState } from "$types/app-state.ts";

export const handler: Handlers<string> = {
  async GET(_req, ctx: FreshContext<AppState>) {
    if (ctx.state.session) {
      await destroySession(ctx.state.session);
    }

    return new Response("", {
      status: 302,
      headers: { Location: "/" },
    });
  },
};
