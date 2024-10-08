import { FreshContext } from "$fresh/server.ts";
import { AppSessionData, AppState } from "$types";
import { resolveCookies } from "$backend/session/cookie.ts";
import { loadSessionState } from "$backend/session/session.ts";

export const sessionLoader = async (
    req: Request,
    ctx: FreshContext<AppState>,
) => {
    const cookies = resolveCookies(req);
    ctx.state.session = await loadSessionState<AppSessionData>(cookies.session);

    return ctx.next();
};
