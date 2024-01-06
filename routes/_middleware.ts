import { antiCsrfTokenGenerator } from "../backend/middlewares/anti-csrf-generator.ts";

export const handler = [
  antiCsrfTokenGenerator,
];
