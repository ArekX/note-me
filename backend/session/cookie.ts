import { Cookie, getCookies, setCookie } from "$std/http/cookie.ts";

const monthInSeconds = 2592000;

type RequestCookies = {
  session: string;
};

export type SessionStateWithId<T> = T & { getId(): string };

export const resolveCookies = (req: Request): RequestCookies => {
  const cookies = getCookies(req.headers);

  return {
    session: cookies.session ?? "",
  };
};

export const createSessionCookie = (sessionId: string): Cookie => {
  return {
    name: "session",
    value: sessionId,
    maxAge: +(Deno.env.get("COOKIE_MAX_AGE_SECONDS") ?? monthInSeconds),
    sameSite: "Strict",
    domain: Deno.env.get("COOKIE_HOSTNAME") ?? "http://localhost:8000",
    path: "/",
    secure: (Deno.env.get("COOKIE_MAX_AGE_SECONDS") ?? "0") == "1",
  };
};

export const writeSessionCookie = <T>(
  headers: Headers,
  session: SessionStateWithId<T>,
): void => {
  setCookie(headers, createSessionCookie(session.getId()));
};
