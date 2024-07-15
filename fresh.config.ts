import { defineConfig } from "$fresh/server.ts";
import tailwind from "$fresh/plugins/tailwind.ts";
import { logger } from "$backend/logger.ts";

export default defineConfig({
    plugins: [tailwind()],
    server: {
        hostname: Deno.env.get("SERVER_ADDRESS") ?? "localhost",
        port: +(Deno.env.get("WEBSERVER_PORT") || 8000),
        onListen({ hostname, port }) {
            logger.info(
                "Webserver started and running at {hostname}:{port}",
                { hostname, port },
            );
        },
    },
});
