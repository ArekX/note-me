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

export const createSessionCookie = (
    sessionId: string,
    headers: Headers,
): Cookie => {
    return {
        name: "session",
        value: sessionId,
        maxAge: +(Deno.env.get("COOKIE_MAX_AGE_SECONDS") ?? monthInSeconds),
        sameSite: "Strict",
        domain: Deno.env.get("COOKIE_DOMAIN") ??
            headers.get("Host")?.split(":")?.[0] ??
            "localhost",
        path: "/",
        secure: (Deno.env.get("COOKIE_MAX_AGE_SECONDS") ?? "0") == "1",
    };
};

export const writeSessionCookie = <T>(
    requestHeaders: Headers,
    responseHeaders: Headers,
    session: SessionStateWithId<T>,
): void => {
    setCookie(
        responseHeaders,
        createSessionCookie(session.getId(), requestHeaders),
    );
};
