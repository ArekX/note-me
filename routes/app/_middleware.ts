import { sessionHandler } from "$backend/session/mod.ts";
import { authRequiredHandler } from "$backend/user/mod.ts";

export const handler = [
  sessionHandler,
  authRequiredHandler,
];
