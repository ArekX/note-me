import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";
import { loadEnvironment } from "./backend/env.ts";

// The dev server must run on the same host/port as production (previously
// configured through fresh.config.ts). The websocket service rejects
// connections whose Origin does not match APP_URL/WEBSERVER_PORT, so a dev
// server on vite's default port would fail every websocket handshake.
loadEnvironment();

const hostname = Deno.env.get("SERVER_ADDRESS") ?? "localhost";
const port = +(Deno.env.get("WEBSERVER_PORT") || 8000);

export default defineConfig({
    server: {
        host: hostname,
        port,
        strictPort: true,
        watch: {
            // Files written by the app at runtime. Any watched file change
            // makes the Fresh plugin trigger a full browser reload, and the
            // sqlite database is written on every request, which would put
            // the browser into a reload loop.
            ignored: [
                "**/*.sqlite*",
                "**/temp/**",
                "**/backup/**",
                "**/backups/**",
                "**/*.log",
            ],
        },
    },
    plugins: [fresh(), tailwindcss()],
    environments: {
        ssr: {
            build: {
                rollupOptions: {
                    // Keep the AWS SDK (S3 backups) out of the server
                    // bundle; its CJS/ESM mix does not bundle cleanly.
                    // Deno resolves the npm: specifiers at runtime.
                    external: (id) => id.startsWith("npm:@aws-sdk/"),
                },
            },
        },
    },
    resolve: {
        alias: [
            // Use mermaid's self-contained ESM bundle. The default entry
            // pulls in CJS-only dependencies (cytoscape plugins) that cannot
            // be bundled for the browser.
            {
                find: /^mermaid$/,
                replacement: "mermaid/dist/mermaid.esm.min.mjs",
            },
        ],
    },
});
