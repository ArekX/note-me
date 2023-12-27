import { db } from "$backend/database.ts";

export const groupExists = async (
  id: number,
  user_id: number,
): Promise<boolean> => {
  return !!(await db.selectFrom("group")
    .select(["id"])
    .where("id", "=", id)
    .where("user_id", "=", user_id)
    .executeTakeFirst());
};

export const assignNoteToGroup = async (
  group_id: number,
  note_id: number,
  user_id: number,
): Promise<void> => {
  if (!(await groupExists(group_id, user_id))) {
    throw new Deno.errors.InvalidData("Group does not exist!");
  }

  await db.insertInto("group_note")
    .values({
      group_id,
      note_id,
      user_id,
    })
    .execute();
};
