import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";

export const antiCsrfSession = (
  _req: Request,
  ctx: FreshContext<AppState>,
) => {
  if (ctx.state.session) {
    ctx.state.session.patch({
      storedCsrfToken: ctx.state.newCsrfToken ?? "",
    });
  }

  return ctx.next();
};
