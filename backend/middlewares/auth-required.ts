import { FreshContext } from "fresh";
import { AppState } from "$types";

export const authRequired = (
    ctx: FreshContext<AppState>,
) => {
    if (!ctx.state.session?.data?.user) {
        return new Response("", {
            status: 302,
            headers: { Location: "/" },
        });
    }

    return ctx.next();
};
