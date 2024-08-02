import { loadSync } from "$std/dotenv/mod.ts";

export const loadEnvironment = () => {
    if (Deno.env.get("SKIP_ENV") == "1") {
        return;
    }

    loadSync({
        export: true,
        allowEmptyValues: true,
    });

    appUrl = new URL(Deno.env.get("APP_URL")!);
};

let appUrl: URL | null = null;

export const getRelyingPartyId = () => {
    return appUrl!.hostname;
};

export const getRelyingPartyOrigin = () => {
    return appUrl!.origin;
};
