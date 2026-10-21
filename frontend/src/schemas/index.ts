import { z } from "zod";

export { z as zod };
export type { ZodIssue } from "zod";

export const validateSchema = async <V extends z.ZodTypeAny>(
    schema: V,
    object: unknown,
): Promise<z.core.$ZodIssue[] | null> => {
    const result = await schema.safeParseAsync(object);
    return result.success ? null : result.error.issues;
};

export const requireValidSchema = async <V extends z.ZodTypeAny>(
    schema: V,
    object: unknown,
): Promise<z.infer<V>> => schema.parseAsync(object);
