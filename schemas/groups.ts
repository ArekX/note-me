import { zod } from "./deps.ts";

const groupSchema = zod.object({
  id: zod.number(),
  name: zod.string({
    required_error: "Name is required",
  }).min(1, "Group name must be at least 1 character long")
    .max(255, "Group name must be at most 255 characters long"),
  parent_id: zod.number({
    required_error: "Parent ID is required",
  }).nullable(),
});

export type AddGroupRequest = zod.infer<typeof addGroupRequestSchema>;

export const addGroupRequestSchema = zod.object({
  name: groupSchema.shape.name,
  parent_id: groupSchema.shape.parent_id,
});

export type DeleteGroupRequest = zod.infer<typeof deleteRequestSchema>;

export const deleteRequestSchema = zod.object({
  id: groupSchema.shape.id,
});

export type UpdateGroupRequest = zod.infer<typeof updateGroupRequestSchema>;

export const updateGroupRequestSchema = zod.object({
  name: addGroupRequestSchema.shape.name.optional(),
  parent_id: addGroupRequestSchema.shape.parent_id.optional(),
});
