import { db } from "$backend/database.ts";
import { RecordId } from "../../types/repository.ts";
import { GroupTable } from "../../types/tables.ts";
import { getCurrentUnixTimestamp } from "$backend/time.ts";
import { sql } from "$lib/kysely-sqlite-dialect/deps.ts";

export type GroupRecord =
  & Pick<GroupTable, "name" | "parent_id" | "created_at">
  & RecordId
  & {
    has_subgroups: number | null;
    has_notes: number | null;
  };

export const getUserGroups = async (
  parent_id: string | null,
  user_id: number,
): Promise<GroupRecord[]> => {
  const query = db.selectFrom("group")
    .select([
      "id",
      "name",
      "parent_id",
      "created_at",
      sql<
        number
      >`(SELECT 1 FROM "group" "gc" WHERE "gc"."parent_id" = "group"."id" LIMIT 1)`
        .as("has_subgroups"),
      sql<
        number
      >`(SELECT 1 FROM "group_note" "gn" WHERE "gn"."group_id" = "group"."id" LIMIT 1)`
        .as("has_notes"),
    ])
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

export type NewGroupRecord = Omit<
  GroupTable,
  "id" | "created_at" | "updated_at"
>;

export const createGroup = async (
  record: NewGroupRecord,
): Promise<GroupRecord> => {
  const insertData = {
    ...record,
    created_at: getCurrentUnixTimestamp(),
  };
  const result = await db.insertInto("group")
    .values(insertData)
    .executeTakeFirst();

  return {
    id: Number(result.insertId),
    ...insertData,
    has_notes: null,
    has_subgroups: null,
  };
};

export type UpdateGroupRecord =
  & Omit<
    GroupTable,
    "id" | "created_at" | "updated_at"
  >
  & RecordId;

export const updateGroup = async (
  record: UpdateGroupRecord,
): Promise<boolean> => {
  const result = await db.updateTable("group")
    .set({
      parent_id: record.parent_id,
      name: record.name,
    })
    .where("id", "=", record.id)
    .where("user_id", "=", record.user_id)
    .executeTakeFirst();

  return result.numUpdatedRows > 0;
};