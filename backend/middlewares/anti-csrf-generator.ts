import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { generateAntiCsrfToken } from "$backend/csrf-token.ts";

export const antiCsrfTokenGenerator = (
  _req: Request,
  ctx: FreshContext<AppState>,
) => {
  ctx.state.newCsrfToken = generateAntiCsrfToken();
  return ctx.next();
};
