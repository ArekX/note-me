import { FreshContext } from "fresh";
import { AppState } from "$types";

export const antiCsrfSession = async (
    ctx: FreshContext<AppState>,
) => {
    // Only set the token once per session. Rotating it on every request
    // invalidates the token embedded in already-rendered pages, which the
    // websocket connection uses when it needs to reconnect.
    if (ctx.state.session && !ctx.state.session.data.storedCsrfToken) {
        await ctx.state.session.patch({
            storedCsrfToken: ctx.state.newCsrfToken ?? "",
        });
    }

    return ctx.next();
};
