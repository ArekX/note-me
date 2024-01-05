import { authRequired, sessionLoader } from "$backend/middlewares/mod.ts";
import { apiErrorHandler } from "$backend/middlewares/api-error-handler.ts";

export const handler = [
  apiErrorHandler,
  sessionLoader,
  authRequired,
];
