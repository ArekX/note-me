import { defineConfig } from "$fresh/server.ts";
import tailwind from "$fresh/plugins/tailwind.ts";

export default defineConfig({
    plugins: [tailwind()],
    server: {
        port: parseInt(Deno.env.get("SERVER_PORT") ?? "8000", 10),
        onListen(params) {
            console.log(
                `NoteMe started and running on http://localhost:${params.port}`,
            );
        },
    },
});
