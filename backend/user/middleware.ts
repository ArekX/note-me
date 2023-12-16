import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types/app-state.ts";

export const authRequiredHandler = (
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
