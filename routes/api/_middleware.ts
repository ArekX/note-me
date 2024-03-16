import { apiErrorHandler } from "$backend/middlewares/api-error-handler.ts";
import { sessionLoader } from "$backend/middlewares/session-loader.ts";
import { authRequired } from "$backend/middlewares/auth-required.ts";
import { loadPermissions } from "$backend/middlewares/load-permissions.ts";
import { antiCsrfTokenValidator } from "$backend/middlewares/anti-csrf-validator.ts";
import { FreshContext } from "$fresh/server.ts";
import { AppState } from "../../types/app-state.ts";

export const handler = [
    apiErrorHandler,
    sessionLoader,
    authRequired,
    antiCsrfTokenValidator,
    loadPermissions,
    async (_req: Request, ctx: FreshContext<AppState>) => {
        const response = await ctx.next();
        response.headers.set("Content-Type", "application/json");
        return response;
    },
];
