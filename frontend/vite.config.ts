/// <reference types="vitest/config" />
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv, runnerImport, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

// The cache name changes with every build, so the new worker drops the
// previous build's assets when it activates.
const serviceWorkerPlugin = (): Plugin => ({
    name: "noteme-service-worker",
    apply: "build",
    generateBundle(_, bundle) {
        const buildId = createHash("sha256")
            .update(Object.keys(bundle).sort().join("\n"))
            .digest("hex")
            .slice(0, 12);
        const source = readFileSync(
            fileURLToPath(new URL("./src/service-worker.js", import.meta.url)),
            "utf8",
        );
        this.emitFile({
            type: "asset",
            fileName: "sw.js",
            source: source.replace("__BUILD_ID__", buildId),
        });
    },
});

const srcDir = fileURLToPath(new URL("./src", import.meta.url));

// Help pages are Vue components, so they are loaded through a separate SSR
// module runner and rendered to markdown for the server's MCP help tools.
const helpExportPlugin = (): Plugin => ({
    name: "noteme-help-export",
    apply: "build",
    async generateBundle() {
        const { module } = await runnerImport<{
            exportHelp: () => Promise<Record<string, string>>;
        }>(`${srcDir}/components/help/help-export.ts`, {
            configFile: false,
            root: fileURLToPath(new URL(".", import.meta.url)),
            logLevel: "error",
            plugins: [vue()],
            resolve: { alias: { "@": srcDir } },
        });
        for (const [fileName, source] of Object.entries(
            await module.exportHelp(),
        )) {
            this.emitFile({ type: "asset", fileName, source });
        }
    },
});

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const apiTarget =
        env.VITE_API_PROXY_TARGET ??
        `http://localhost:${env.WEBSERVER_PORT ?? "8000"}`;

    return {
        plugins: [
            vue(),
            tailwindcss(),
            helpExportPlugin(),
            serviceWorkerPlugin(),
        ],
        resolve: {
            alias: {
                "@": srcDir,
            },
        },
        server: {
            host: env.VITE_DEV_HOST ?? "localhost",
            port: Number(env.VITE_DEV_PORT ?? 5173),
            strictPort: true,
            proxy: {
                "/api": { target: apiTarget, changeOrigin: true },
                "/file": { target: apiTarget, changeOrigin: true },
                // /oauth/authorize stays here: Vite serves the consent page.
                "/oauth/token": { target: apiTarget, changeOrigin: true },
                "/.well-known": { target: apiTarget, changeOrigin: true },
                "/mcp": { target: apiTarget, changeOrigin: true },
                "/ws": {
                    target: apiTarget,
                    changeOrigin: true,
                    ws: true,
                    // The server only accepts websocket connections from its own APP_URL.
                    headers: { origin: apiTarget },
                },
            },
        },
        build: {
            outDir: "dist",
            emptyOutDir: true,
            sourcemap: false,
        },
        test: {
            environment: "jsdom",
            globals: false,
            setupFiles: ["./src/test/setup.ts"],
            include: ["src/**/*.{test,spec}.ts"],
            coverage: {
                provider: "v8",
                reporter: ["text", "html"],
                include: ["src/**/*.{ts,vue}"],
            },
        },
    };
});
