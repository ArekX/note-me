import { FreshContext, Handlers } from "$fresh/server.ts";
import { NoteRecord } from "$backend/repository/note-repository.ts";
import { AppState } from "$types";
import { zod } from "$backend/deps.ts";
import { createGroup } from "$backend/repository/group-repository.ts";

export const addGroupRequestSchema = zod.object({
  name: zod.string().min(1).max(255),
  parent_id: zod.number().nullable(),
});

export type AddGroupRequest = zod.infer<typeof addGroupRequestSchema>;

export const handler: Handlers<NoteRecord | null> = {
  async POST(
    req: Request,
    ctx: FreshContext<AppState>,
  ): Promise<Response> {
    const body: AddGroupRequest = await (req.json());

    const { id: userId = -1 } = ctx.state.session?.data.user ?? {};

    const result = await createGroup({
      ...body,
      user_id: userId,
    });

    return new Response(JSON.stringify(result), {
      status: 201,
    });
  },
};
