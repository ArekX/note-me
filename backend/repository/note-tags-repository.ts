import { db } from "$backend/database.ts";
import { NoteTagTable, RecordId, Tables } from "$types";
import { getCurrentUnixTimestamp } from "$backend/time.ts";
import { Kysely } from "$backend/deps.ts";
import { Transaction } from "$lib/kysely-sqlite-dialect/deps.ts";

export type TagRecord =
  & Pick<
    NoteTagTable,
    "name"
  >
  & RecordId;

export const resolveTags = async (
  userId: number,
  tags: string[],
): Promise<TagRecord[]> => {
  if (tags.length == 0) {
    return [];
  }

  const existingTags = await db.selectFrom("note_tag")
    .select(["id", "name"])
    .where("name", "in", tags)
    .execute();

  const newRecords = tags
    .filter((tag) => existingTags.find((r) => r.name === tag) === undefined)
    .map((tag) => ({
      name: tag,
      user_id: userId,
      created_at: getCurrentUnixTimestamp(),
    }));

  if (newRecords.length > 0) {
    const results = await db.insertInto("note_tag")
      .values(newRecords)
      .execute();

    for (let i = 0; i < results.length; i++) {
      existingTags.push({
        id: Number(results[i].insertId),
        ...newRecords[i],
      });
    }
  }

  return existingTags;
};

export const linkNoteWithTags = async (
  note_id: number,
  user_id: number,
  tags: string[],
): Promise<boolean> => {
  const tagRecords = await resolveTags(note_id, tags);

  if (tagRecords.length == 0) {
    return true;
  }

  const results = await db.insertInto("note_tag_note")
    .values(tagRecords.map((tagRecord) => ({
      note_id,
      user_id,
      tag_id: tagRecord.id,
      created_at: getCurrentUnixTimestamp(),
    })))
    .execute();

  if (results.length !== tagRecords.length) {
    throw new Error("Could not link note with tags!");
  }
  return true;
};
