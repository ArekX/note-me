import { loadSync } from "$std/dotenv/mod.ts";

export const loadEnvironment = () => {
    if (Deno.env.get("SKIP_ENV") == "1") {
        return;
    }

    loadSync({
        export: true,
        allowEmptyValues: true,
    });
};
