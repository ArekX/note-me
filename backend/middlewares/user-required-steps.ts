import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";

export const userRequiredSteps = (
    _req: Request,
    ctx: FreshContext<AppState>,
) => {
    if (ctx.route === "/app/logout") {
        return ctx.next();
    }

    if (ctx.state.session?.data.user?.is_password_reset_required) {
        if (ctx.route !== "/app/reset-password") {
            return new Response("", {
                status: 302,
                headers: { Location: "/app/reset-password" },
            });
        }
    }

    return ctx.next();
};
