import { FreshContext } from "fresh";
import { AppState } from "$types";

export const antiCsrfTokenGenerator = (
    ctx: FreshContext<AppState>,
) => {
    ctx.state.newCsrfToken = crypto.randomUUID();
    return ctx.next();
};
