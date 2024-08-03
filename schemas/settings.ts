import { zod } from "$schemas/deps.ts";

export const backupNameSchema = zod.object({
    name: zod.string().regex(/^[a-zA-Z0-9.-]+$/),
});
