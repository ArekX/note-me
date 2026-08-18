import { loadSync } from "@std/dotenv";

export const loadEnvironment = () => {
    if (Deno.env.get("SKIP_ENV") == "1") {
        return;
    }

    // Variables that are already set always win; loadSync never overrides
    // existing environment variables. @std/dotenv removed the defaultsPath
    // option, so .env.defaults is loaded explicitly after .env to fill in
    // anything that is still missing.
    loadSync({
        export: true,
    });

    loadSync({
        envPath: ".env.defaults",
        export: true,
    });
};

const trimSlashes = (str: string): string => {
    return str.replace(/^\/+|\/+$/g, "");
};

export const getAssetUrl = (asset: string) =>
    `${trimSlashes(getAppUrl().toString())}/${trimSlashes(asset)}`;

export const getAppUrl = () =>
    new URL(
        Deno.env.get("APP_URL") ??
            `http://localhost:${Deno.env.get("WEBSERVER_PORT") ?? "8000"}`,
    );

export const getSocketHostname = (req: Request) => {
    const host = Deno.env.get("SOCKET_HOSTNAME");
    if (host) {
        return host;
    }

    const requestHost = req.headers.get("host")?.split(":")[0] ?? "localhost";
    const port = +(Deno.env.get("WEBSOCKET_PORT") ?? "8080");
    return `ws://${requestHost}:${port}`;
};
