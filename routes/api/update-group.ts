import { FreshContext, Handlers } from "$fresh/server.ts";
import { NoteRecord } from "$backend/repository/note-repository.ts";
import { AppState } from "$types";
import { zod } from "$backend/deps.ts";
import { updateGroup } from "$backend/repository/group-repository.ts";

export const updateGroupRequestSchema = zod.object({
  id: zod.number(),
  name: zod.string().min(1).max(255),
  parent_id: zod.number().nullable(),
});

export type UpdateGroupRequest = zod.infer<typeof updateGroupRequestSchema>;

export const handler: Handlers<NoteRecord | null> = {
  async POST(
    req: Request,
    ctx: FreshContext<AppState>,
  ): Promise<Response> {
    const body: UpdateGroupRequest = await (req.json());

    const { id: userId = -1 } = ctx.state.session?.data.user ?? {};

    const result = await updateGroup({
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
  },
};
