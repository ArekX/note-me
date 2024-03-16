import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";

export const antiCsrfTokenGenerator = (
    _req: Request,
    ctx: FreshContext<AppState>,
) => {
    ctx.state.newCsrfToken = crypto.randomUUID();
    return ctx.next();
};
