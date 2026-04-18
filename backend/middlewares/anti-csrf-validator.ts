import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";

const validatedMethods = ["POST", "PUT", "DELETE"];

export const antiCsrfTokenValidator = (
    req: Request,
    ctx: FreshContext<AppState>,
) => {
    const storedToken = ctx.state.session?.data.storedCsrfToken;

    if (validatedMethods.includes(req.method)) {
        const headerToken = req.headers.get("X-CSRF-Token");

        if (!storedToken || headerToken !== storedToken) {
            return new Response("Invalid or missing CSRF token", {
                status: 403,
            });
        }
    }
    return ctx.next();
};
