import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { zod } from "$backend/deps.ts";
import { createGroup } from "$backend/repository/group-repository.ts";
import { validateSchema } from "$backend/schemas.ts";

export const addGroupRequestSchema = zod.object({
  name: zod.string().min(1).max(255),
  parent_id: zod.number().nullable(),
});

export type AddGroupRequest = zod.infer<typeof addGroupRequestSchema>;

export const handleAddGroup = async (
  req: Request,
  ctx: FreshContext<AppState>,
): Promise<Response> => {
  const body: AddGroupRequest = await (req.json());

  const { id: userId = -1 } = ctx.state.session?.data.user ?? {};

  await validateSchema(addGroupRequestSchema, body);

  const result = await createGroup({
    ...body,
    user_id: userId,
  });

  return new Response(JSON.stringify(result), {
    status: 201,
  });
};
