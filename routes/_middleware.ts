import { antiCsrfTokenGenerator } from "$backend/middlewares/anti-csrf-generator.ts";
import { sessionLoader } from "$backend/middlewares/session-loader.ts";

export const handler = [
    sessionLoader,
    antiCsrfTokenGenerator,
];
