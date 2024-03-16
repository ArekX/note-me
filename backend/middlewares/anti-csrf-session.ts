import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";

export const antiCsrfSession = async (
    _req: Request,
    ctx: FreshContext<AppState>,
) => {
    if (ctx.state.session) {
        await ctx.state.session.patch({
            storedCsrfToken: ctx.state.newCsrfToken ?? "",
        });
    }

    return ctx.next();
};
