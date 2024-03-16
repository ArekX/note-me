import { zod } from "./deps.ts";

export const validateRequest = async <
    V,
>(
    schema: zod.ZodTypeAny,
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

export const validateSchema = async <V>(
    schema: zod.ZodTypeAny,
    object: V,
) => {
    try {
        await schema.parseAsync(object);
        return null;
    } catch (err) {
        if (err instanceof zod.ZodError) {
            return err.errors;
        }
        throw err;
    }
};
