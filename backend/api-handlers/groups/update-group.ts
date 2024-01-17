import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { zod } from "$backend/deps.ts";
import { updateGroup } from "$backend/repository/group-repository.ts";

export const updateGroupRequestSchema = zod.object({
  name: zod.string().min(1).max(255),
  parent_id: zod.number().nullable(),
});

export type UpdateGroupRequest = zod.infer<typeof updateGroupRequestSchema>;

export const handleUpdateGroup = async (
  req: Request,
  ctx: FreshContext<AppState>,
): Promise<Response> => {
  const body: UpdateGroupRequest = await (req.json());

  const { id: userId = -1 } = ctx.state.session?.data.user ?? {};

  const result = await updateGroup({
    id: +ctx.params.id,
    ...body,
    user_id: userId,
  });

  return new Response(
    JSON.stringify({
      success: result,
    }),
    {
      status: 201,
    },
  );
};
