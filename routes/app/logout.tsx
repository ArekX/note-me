import { FreshContext } from "fresh";
import { destroySession } from "$backend/session/mod.ts";
import { AppState } from "$types";
import { Handlers } from "fresh/compat";

export const handler: Handlers<string> = {
    async GET(ctx: FreshContext<AppState>) {
        if (ctx.state.session) {
            await destroySession(ctx.state.session.getUserId());
        }

        return new Response("", {
            status: 302,
            headers: { Location: "/" },
        });
    },
};
