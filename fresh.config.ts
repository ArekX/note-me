import { defineConfig } from "$fresh/server.ts";
import tailwind from "$fresh/plugins/tailwind.ts";
import { logger } from "$backend/logger.ts";

const hostname = Deno.env.get("SERVER_ADDRESS") ?? "localhost";
const port = +(Deno.env.get("WEBSERVER_PORT") || 8000);

export default defineConfig({
    plugins: [tailwind()],
    server: {
        hostname,
        port,
        onListen() {
            logger.info("Webserver started and running at {hostname}:{port}", {
                hostname,
                port,
            });
        },
    },
});
