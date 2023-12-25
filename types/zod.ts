import { zod } from "$vendor";

export type SchemaErrors<T extends zod.ZodType> =
  | zod.ZodFormattedError<zod.infer<T>>
  | null;
