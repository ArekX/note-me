import { antiCsrfTokenGenerator } from "$backend/middlewares/anti-csrf-generator.ts";
import { sessionLoader } from "$backend/middlewares/session-loader.ts";
import { loadPermissions } from "$backend/middlewares/load-permissions.ts";

export const handler = [
    sessionLoader,
    antiCsrfTokenGenerator,
    loadPermissions,
];
