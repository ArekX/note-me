import { zod } from "$schemas/deps.ts";

const fileSchema = zod.object({
    id: zod.number(),
    identifier: zod.string(),
    name: zod.string({
        required_error: "Name is required",
    }).min(1, "Name must be at least 1 character long")
        .max(255, "Group name must be at most 255 characters long"),
    size: zod.number(),
    mime_type: zod.string(),
});

export const addFileRequestSchema = zod.object({
    name: fileSchema.shape.name,
    size: fileSchema.shape.size,
    mime_type: fileSchema.shape.mime_type,
}).strict();

export type AddFileRequest = zod.infer<typeof addFileRequestSchema>;

export const deleteFileRequestSchema = zod.object({
    identifier: fileSchema.shape.identifier,
}).strict();

export type DeleteFileRequest = zod.infer<typeof deleteFileRequestSchema>;