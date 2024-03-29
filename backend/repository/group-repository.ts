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

const getGroupQuery = () =>
    db.selectFrom("group")
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
        .where("is_deleted", "=", false);

export const getUserGroups = async (
    parent_id: string | null,
    user_id: number,
): Promise<GroupRecord[]> => {
    let query = getGroupQuery()
        .where("user_id", "=", user_id)
        .where("is_deleted", "=", false)
        .orderBy("id", "asc");

    if (parent_id) {
        query = query.where("parent_id", "=", +parent_id);
    } else {
        query = query.where("parent_id", "is", null);
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
    group_id: number | null,
    note_id: number,
    user_id: number,
): Promise<void> => {
    if (group_id && !(await groupExists(group_id, user_id))) {
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
    & Partial<
        Pick<GroupTable, "name" | "parent_id">
    >
    & RecordId;

export const updateGroup = async (
    user_id: number,
    record: UpdateGroupRecord,
): Promise<boolean> => {
    const valuesToChange = {} as Partial<UpdateGroupRecord>;

    if (record.name) {
        valuesToChange.name = record.name;
    }

    if (record.parent_id !== undefined) {
        valuesToChange.parent_id = record.parent_id;
    }

    const result = await db.updateTable("group")
        .set(valuesToChange)
        .where("id", "=", record.id)
        .where("user_id", "=", user_id)
        .executeTakeFirst();

    return result.numUpdatedRows > 0;
};

export const deleteGroup = async (
    id: number,
    user_id: number,
): Promise<boolean> => {
    const result = await db.updateTable("group")
        .set({
            is_deleted: true,
        })
        .where("id", "=", id)
        .where("user_id", "=", user_id)
        .executeTakeFirst();

    return result.numUpdatedRows > 0;
};

export const getSingleUserGroup = async (
    id: number,
    user_id: number,
): Promise<GroupRecord | null> => {
    return await getGroupQuery()
        .where("id", "=", id)
        .where("user_id", "=", user_id)
        .executeTakeFirst() ?? null;
};
