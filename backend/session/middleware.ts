import { FreshContext } from "$fresh/server.ts";
import { AppSessionData, AppState } from "$types/app-state.ts";
import { resolveCookies } from "./cookie.ts";
import { loadSessionState } from "./session.ts";

export const sessionHandler = async (
  req: Request,
  ctx: FreshContext<AppState>,
) => {
  const cookies = resolveCookies(req);
  ctx.state.session = await loadSessionState<AppSessionData>(cookies.session);
  return ctx.next();
};
