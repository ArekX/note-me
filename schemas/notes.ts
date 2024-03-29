import { zod } from "./deps.ts";

const noteSchema = zod.object({
    title: zod.string().min(1, "Title must have at least one character"),
    text: zod.string(),
    user_id: zod.number(),
    tags: zod.array(zod.string()).max(20, "Note can have at most 20 tags"),
    group_id: zod.number().nullable(),
});

export const addNoteRequestSchema = zod.object({
    title: noteSchema.shape.title,
    text: noteSchema.shape.text,
    tags: noteSchema.shape.tags,
    group_id: noteSchema.shape.group_id,
}).strict();

export type AddNoteRequest = zod.infer<typeof addNoteRequestSchema>;

export const updateNoteSchema = zod.object({
    // title: noteSchema.shape.title,
    // text: noteSchema.shape.text,
    // tags: noteSchema.shape.tags,
    group_id: noteSchema.shape.group_id.optional(),
}).strict();

export type UpdateNoteRequest = zod.infer<typeof updateNoteSchema>;
