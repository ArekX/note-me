import { FreshContext } from "fresh";
import { AppSessionData, AppState } from "$types";
import { resolveCookies } from "$backend/session/cookie.ts";
import { loadSessionState } from "$backend/session/session.ts";

export const sessionLoader = async (
    ctx: FreshContext<AppState>,
) => {
    const req = ctx.req;
    const cookies = resolveCookies(req);
    ctx.state.session = await loadSessionState<AppSessionData>(cookies.session);

    return ctx.next();
};
