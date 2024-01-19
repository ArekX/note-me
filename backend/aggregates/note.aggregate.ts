import {
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
} from "$backend/database.ts";
import { createNote } from "$backend/repository/note-repository.ts";
import { linkNoteWithTags } from "$backend/repository/note-tags-repository.ts";
import { assignNoteToGroup } from "$backend/repository/group-repository.ts";
import { validateRequest } from "$schemas/mod.ts";
import { AddNoteAggregate, addNoteAggregateSchema } from "$schemas/notes.ts";

export const createNoteAggregate = async (note: AddNoteAggregate) => {
  await validateRequest(addNoteAggregateSchema, note);

  await beginTransaction();

  try {
    const record = await createNote({
      title: note.title,
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
