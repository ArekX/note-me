import { db } from "$backend/database.ts";
import { sql } from "../../lib/kysely-sqlite-dialect/deps.ts";

export interface TreeRecord {
    type: "group" | "note";
    id: number;
    name: string;
    has_children: number;
}

export const getTreeList = async (
    group_id: number | null,
    user_id: number,
): Promise<TreeRecord[]> => {
    const results = await db.selectFrom("group")
        .select([
            sql<string>`'group'`.as("type"),
            "id",
            "name",
            sql<number>`COALESCE((
                SELECT 1 FROM "group" "gc" WHERE "gc"."parent_id" = "group"."id"
                UNION
                SELECT 1 FROM "group_note" "gn" WHERE "gn"."group_id" = "group"."id" AND "gn"."note_id" NOT IN (
                    SELECT id FROM note WHERE is_deleted = true
                ) LIMIT 1
            ), 0)`.as("has_children"),
        ])
        .where("parent_id", group_id ? "=" : "is", group_id)
        .where("user_id", "=", user_id)
        .where("is_deleted", "=", false)
        .union(
            db.selectFrom("group_note")
                .select([
                    sql<string>`'note'`.as("type"),
                    sql<number>`note.id`.as("id"),
                    sql<string>`note.title`.as("name"),
                    sql<number>`0`.as("has_children"),
                ])
                .innerJoin("note", "note.id", "group_note.note_id")
                .where("group_note.group_id", group_id ? "=" : "is", group_id)
                .where("note.is_deleted", "=", false)
                .where("group_note.user_id", "=", user_id)
                .where("note.user_id", "=", user_id),
        )
        .orderBy("type")
        .orderBy("id")
        .execute();

    return results as TreeRecord[];
};
