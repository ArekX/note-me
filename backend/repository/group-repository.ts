import { db } from "$backend/database.ts";
import { RecordId } from "../../types/repository.ts";
import { GroupTable } from "../../types/tables.ts";

export type GroupRecord =
  & Pick<GroupTable, "name" | "parent_id">
  & RecordId;

export const getUserGroups = async (
  parent_id: string | null,
  user_id: number,
): Promise<GroupRecord[]> => {
  const query = db.selectFrom("group")
    .select(["id", "name", "parent_id"])
    .where("user_id", "=", user_id);

  if (parent_id) {
    query.where("parent_id", "=", +parent_id);
  } else {
    query.where("parent_id", "is", null);
  }

  return await query.execute();
};

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
