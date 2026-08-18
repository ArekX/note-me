// Production entrypoint. Serves the vite-built app from _fresh/server.js so
// that host/port can be taken from the environment, which is loaded by
// bootstrap() when the built server module is imported.
// @ts-ignore: the built server bundle has no type declarations
import server from "./_fresh/server.js";
import { logger, setLoggerName } from "$backend/logger.ts";

setLoggerName("backend");

const hostname = Deno.env.get("SERVER_ADDRESS") ?? "localhost";
const port = +(Deno.env.get("WEBSERVER_PORT") || 8000);

Deno.serve({
    hostname,
    port,
    onListen() {
        logger.info("Webserver started and running at {hostname}:{port}", {
            hostname,
            port,
        });
    },
}, (req: Request, info: Deno.ServeHandlerInfo) => server.fetch(req, info));
