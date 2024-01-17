import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { zod } from "$backend/deps.ts";
import { deleteGroup } from "$backend/repository/group-repository.ts";
import { validateSchema } from "$backend/schemas.ts";

export const deleteRequestSchema = zod.object({
  id: zod.number(),
});

export type DeleteGroupRequest = zod.infer<typeof deleteRequestSchema>;

export const handleDeleteGroup = async (
  _req: Request,
  ctx: FreshContext<AppState>,
): Promise<Response> => {
  const body: DeleteGroupRequest = {
    id: +ctx.params.id,
  };

  await validateSchema(deleteRequestSchema, body);

  const { id: userId = -1 } = ctx.state.session?.data.user ?? {};

  const result = await deleteGroup(body.id, userId);

  return new Response(JSON.stringify(result), {
    status: 201,
  });
};
