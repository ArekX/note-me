import { zod } from "./deps.ts";

const noteSchema = zod.object({
    title: zod.string().min(1, "Title must have at least one character"),
    text: zod.string(),
    user_id: zod.number(),
    is_encrypted: zod.boolean(),
    tags: zod.array(zod.string()).max(20, "Note can have at most 20 tags"),
    group_id: zod.number().nullable(),
});

export const addNoteRequestSchema = zod.object({
    title: noteSchema.shape.title,
    text: noteSchema.shape.text,
    is_encrypted: noteSchema.shape.is_encrypted,
    tags: noteSchema.shape.tags,
    group_id: noteSchema.shape.group_id,
}).strict();

export type AddNoteRequest = zod.infer<typeof addNoteRequestSchema>;

export const updateNoteSchema = zod.object({
    title: noteSchema.shape.title.optional(),
    is_encrypted: noteSchema.shape.is_encrypted.optional(),
    text: noteSchema.shape.text.optional(),
    tags: noteSchema.shape.tags.optional(),
    group_id: noteSchema.shape.group_id.optional(),
}).strict();

export type UpdateNoteRequest = zod.infer<typeof updateNoteSchema>;

export const setReminderSchema = zod.object({
    note_id: zod.number(),
    reminder: zod.object({
        type: zod.enum(["once"]),
        next_at: zod.number(),
    }).or(
        zod.object({
            type: zod.enum(["repeat"]),
            interval: zod.number().min(1),
            unit_value: zod.number().min(1),
            repeat_count: zod.number().min(1),
        }),
    ),
}).strict();

export type SetReminderRequest = zod.infer<typeof setReminderSchema>;
