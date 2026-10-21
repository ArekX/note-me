import { zod } from "./index";

const tagSchema = zod.object({
    name: zod
        .string()
        .min(1, "Name must have at least one character")
        .max(255, "Name must have at most 255 characters"),
});

export const addTagSchema = zod
    .object({
        name: tagSchema.shape.name,
    })
    .strict();

export type AddTagRequest = zod.infer<typeof addTagSchema>;

export const updateTagSchema = zod
    .object({
        name: tagSchema.shape.name.optional(),
    })
    .strict();

export type UpdateTagRequest = zod.infer<typeof updateTagSchema>;
