import { zod } from "$backend/deps.ts";

export type SchemaErrors<T extends zod.ZodType> =
    | zod.ZodFormattedError<zod.infer<T>>
    | null;
