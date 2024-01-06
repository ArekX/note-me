import { apiErrorHandler } from "$backend/middlewares/api-error-handler.ts";
import { sessionLoader } from "$backend/middlewares/session-loader.ts";
import { authRequired } from "$backend/middlewares/auth-required.ts";
import { antiCsrfTokenValidator } from "$backend/middlewares/anti-csrf-validator.ts";

export const handler = [
  apiErrorHandler,
  sessionLoader,
  authRequired,
  antiCsrfTokenValidator,
];
