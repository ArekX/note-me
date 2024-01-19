import { zod } from "./deps.ts";

export type AddGroupRequest = zod.infer<typeof addGroupRequestSchema>;

export const addGroupRequestSchema = zod.object({
  name: zod.string().min(1).max(255),
  parent_id: zod.number().nullable(),
});

export type DeleteGroupRequest = zod.infer<typeof deleteRequestSchema>;

export const deleteRequestSchema = zod.object({
  id: zod.number(),
});

export type UpdateGroupRequest = zod.infer<typeof updateGroupRequestSchema>;

export const updateGroupRequestSchema = zod.object({
  name: zod.string().min(1).max(255),
  parent_id: zod.number().nullable(),
});
