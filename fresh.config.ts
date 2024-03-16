import { defineConfig } from "$fresh/server.ts";
import tailwind from "$fresh/plugins/tailwind.ts";

export default defineConfig({
    plugins: [tailwind()],
    server: {
        onListen(params) {
            console.log(
                `NoteMe started and running on http://localhost:${params.port}`,
            );
        },
    },
});
