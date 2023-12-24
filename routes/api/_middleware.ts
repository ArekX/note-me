import { authRequired, sessionLoader } from "$backend/middlewares/mod.ts";

export const handler = [
  sessionLoader,
  authRequired,
];
