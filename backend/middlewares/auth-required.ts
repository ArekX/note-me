import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";

export const authRequired = (
  _req: Request,
  ctx: FreshContext<AppState>,
) => {
  if (!ctx.state.session?.data?.user) {
    return new Response("", {
      status: 302,
      headers: { Location: "/" },
    });
  }

  return ctx.next();
};
