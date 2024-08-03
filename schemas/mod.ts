import { zod } from "./deps.ts";

export const requireValidSchema = async <
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

export const validateSchema = async <V extends zod.ZodTypeAny>(
    schema: V,
    object: zod.infer<V>,
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
