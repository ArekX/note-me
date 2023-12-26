import { zod } from "$backend/deps.ts";

export const createNoteSchema = zod.object({
  text: zod.string().min(1, "Note must have at least one character"),
});

export const validateSchema = async <T extends zod.ZodRawShape, V>(
  schema: zod.ZodObject<T>,
  object: V,
) => {
  try {
    await schema.parseAsync(object);
  } catch (err) {
    if (err instanceof zod.ZodError) {
      throw new Deno.errors.InvalidData(JSON.stringify(err.errors));
    }
  }
};
