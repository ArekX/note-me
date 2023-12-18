import { FreshContext } from "$fresh/server.ts";
import { AppSessionData, AppState } from "$types/app-state.ts";
import { resolveCookies } from "../session/cookie.ts";
import { loadSessionState } from "../session/session.ts";

export const sessionLoader = async (
  req: Request,
  ctx: FreshContext<AppState>,
) => {
  const cookies = resolveCookies(req);
  ctx.state.session = await loadSessionState<AppSessionData>(cookies.session);
  return ctx.next();
};
