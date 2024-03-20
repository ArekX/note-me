import { zod } from "$schemas/deps.ts";

export type SchemaErrors<T> =
    | zod.ZodFormattedError<T>
    | null;
