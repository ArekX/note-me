import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { parseQueryParams } from "$backend/parse-query-params.ts";

interface AntiCsrfToken {
    csrf: string;
}

const validatedMethods = ["POST", "PUT", "DELETE"];

export const antiCsrfTokenValidator = (
    req: Request,
    ctx: FreshContext<AppState>,
) => {
    const storedToken = ctx.state.session?.data.storedCsrfToken;

    if (validatedMethods.includes(req.method)) {
        const params = parseQueryParams<AntiCsrfToken>(req.url, {
            csrf: { type: "string" },
        });

        if (params.csrf != storedToken) {
            return new Response("Invalid or missing CSRF token", {
                status: 403,
            });
        }
    }
    return ctx.next();
};
