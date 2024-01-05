import { FreshContext, Handlers } from "$fresh/server.ts";
import { NoteRecord } from "$backend/repository/note-repository.ts";
import { AppState } from "$types";
import { zod } from "$backend/deps.ts";
import {
  createNoteAggregate,
  noteAggregateSchema,
} from "$backend/aggregates/note.aggregate.ts";

export const noteRequestSchema = zod.object({
  text: noteAggregateSchema.shape.text,
  tags: noteAggregateSchema.shape.tags,
  group_id: noteAggregateSchema.shape.group_id,
});

export type AddNoteRequest = zod.infer<typeof noteRequestSchema>;

export const handler: Handlers<NoteRecord | null> = {
  async POST(
    req: Request,
    ctx: FreshContext<AppState>,
  ): Promise<Response> {
    const body: AddNoteRequest = await (req.json());

    const { id: userId = -1 } = ctx.state.session?.data.user ?? {};

    const result = await createNoteAggregate({
      ...body,
      user_id: userId,
    });

    return new Response(JSON.stringify(result), {
      status: 201,
    });
  },
};
