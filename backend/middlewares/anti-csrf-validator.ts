import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { parseQueryParams } from "$backend/parse-query-params.ts";

interface AntiCsrfToken {
  csrf: string;
}

export const antiCsrfTokenValidator = (
  req: Request,
  ctx: FreshContext<AppState>,
) => {
  const storedToken = ctx.state.session?.data.storedCsrfToken;
  if (req.method == "POST") {
    const params = parseQueryParams<AntiCsrfToken>(req.url);

    console.log(params.csrf, storedToken);

    if (params.csrf != storedToken) {
      return new Response("Invalid CSRF token", {
        status: 403,
      });
    }
  }
  return ctx.next();
};
