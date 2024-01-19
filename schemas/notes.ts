import { zod } from "./deps.ts";

export type AddNoteAggregate = zod.infer<typeof addNoteAggregateSchema>;

export const addNoteAggregateSchema = zod.object({
  title: zod.string().min(1, "Note Title must have at least one character"),
  text: zod.string().min(1, "Note must have at least one character"),
  user_id: zod.number(),
  tags: zod.array(zod.string()),
  group_id: zod.number().nullable(),
});

export const addNoteRequestSchema = zod.object({
  title: addNoteAggregateSchema.shape.title,
  text: addNoteAggregateSchema.shape.text,
  tags: addNoteAggregateSchema.shape.tags,
  group_id: addNoteAggregateSchema.shape.group_id,
});

export type AddNoteRequest = zod.infer<typeof addNoteRequestSchema>;
