import { App, staticFiles } from "fresh";
import { bootstrap } from "./bootstrap.ts";
import type { AppState } from "$types";

await bootstrap();

export const app = new App<AppState>();

app.use(staticFiles());

app.fsRoutes();
