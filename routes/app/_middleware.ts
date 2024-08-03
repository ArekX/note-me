import { sessionLoader } from "$backend/middlewares/session-loader.ts";
import { authRequired } from "$backend/middlewares/auth-required.ts";
import { antiCsrfTokenValidator } from "$backend/middlewares/anti-csrf-validator.ts";
import { antiCsrfSession } from "$backend/middlewares/anti-csrf-session.ts";
import { loadPermissions } from "$backend/middlewares/load-permissions.ts";
import { userRequiredSteps } from "$backend/middlewares/user-required-steps.ts";

export const handler = [
    sessionLoader,
    authRequired,
    antiCsrfTokenValidator,
    antiCsrfSession,
    loadPermissions,
    userRequiredSteps,
];
