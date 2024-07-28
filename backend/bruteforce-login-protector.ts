import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { getCurrentUnixTimestamp } from "$lib/time/unix.ts";

const ipLoginAttempts: {
    [ip: string]: {
        attempts: number;
        last_attempt_at: number;
        locked_until?: number;
    };
} = {};

const MAX_ATTEMPTS = 30;
const COOLDOWN_SECONDS = 60;
const LOCKOUT_SECONDS = 900;

export const checkLoginAttempt = (
    req: Request,
    ctx: FreshContext<AppState>,
) => {
    const requestIp = req.headers.get("x-forwarded-for") ||
        req.headers.get("cf-connecting-ip") ||
        ctx.remoteAddr.hostname ||
        null;

    if (!requestIp) {
        throw new Error("Invalid request");
    }

    const attempts = ipLoginAttempts?.[requestIp] ?? {
        attempts: 0,
        last_attempt_at: 0,
    };

    const now = getCurrentUnixTimestamp();

    if (attempts.locked_until && attempts.locked_until > now) {
        attempts.locked_until = now + LOCKOUT_SECONDS;
        throw new Deno.errors.PermissionDenied(
            "Too many login requests, please try again later.",
        );
    }

    if (now - attempts.last_attempt_at < COOLDOWN_SECONDS) {
        attempts.attempts++;
    } else {
        attempts.attempts = 1;
    }

    if (attempts.attempts > MAX_ATTEMPTS) {
        attempts.locked_until = now + LOCKOUT_SECONDS;
        throw new Deno.errors.PermissionDenied(
            "Too many login requests, please try again later.",
        );
    }

    attempts.last_attempt_at = now;

    ipLoginAttempts[requestIp] = attempts;
};
