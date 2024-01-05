import { zod } from "$backend/deps.ts";
import { validateSchema } from "$backend/schemas.ts";
import {
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
} from "$backend/database.ts";
import { createNote } from "$backend/repository/note-repository.ts";
import { linkNoteWithTags } from "$backend/repository/note-tags-repository.ts";
import { assignNoteToGroup } from "$backend/repository/group-repository.ts";

export const noteAggregateSchema = zod.object({
  text: zod.string().min(1, "Note must have at least one character"),
  user_id: zod.number(),
  tags: zod.array(zod.string()),
  group_id: zod.number().nullable(),
});

export type NoteAggregate = zod.infer<typeof noteAggregateSchema>;

export const createNoteAggregate = async (note: NoteAggregate) => {
  await validateSchema(noteAggregateSchema, note);

  await beginTransaction();

  try {
    const record = await createNote({
      note: note.text,
      user_id: note.user_id,
    });

    await Promise.all([
      linkNoteWithTags(note.user_id, record.id, note.tags),
      note.group_id
        ? assignNoteToGroup(note.group_id, record.id, note.user_id)
        : Promise.resolve(),
    ]);

    await commitTransaction();

    return {
      ...record,
      tags: note.tags,
      group_id: note.group_id,
    };
  } catch (e) {
    await rollbackTransaction();
    throw e;
  }
};
