import { FreshContext } from "$fresh/server.ts";
import { AppState } from "../../types/app-state.ts";

export function handler(
  _req: Request,
  ctx: FreshContext<AppState>,
) {
  if (!ctx.state.user) {
    return new Response(null, {
      status: 302,
      headers: { "Location": "/" },
    });
  }

  return ctx.next();
}
