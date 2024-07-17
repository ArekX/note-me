import { db } from "$backend/database.ts";
import { sql } from "$lib/kysely-sqlite-dialect/deps.ts";

export type ItemType = "note" | "group";

export interface TreeRecord {
    type: ItemType;
    id: number;
    name: string;
    has_children: number;
}

const getGroupQuery = (
    options: {
        user_id: number;
        group_id: number | null;
        include_only_group_children?: boolean;
    },
) => {
    const hasChildren = options.include_only_group_children
        ? sql<number>`COALESCE((
                SELECT 1 FROM "group" "gc" WHERE "gc"."parent_id" = "group"."id" LIMIT 1
            ), 0)`.as("has_children")
        : sql<number>`COALESCE((
                SELECT 1 FROM "group" "gc" WHERE "gc"."parent_id" = "group"."id"
                UNION
                SELECT 1 FROM "group_note" "gn" WHERE "gn"."group_id" = "group"."id" AND "gn"."note_id" NOT IN (
                    SELECT id FROM note WHERE is_deleted = true
                ) LIMIT 1
            ), 0)`.as("has_children");

    return db.selectFrom("group")
        .select([
            sql<string>`'group'`.as("type"),
            "id",
            "name",
            hasChildren,
        ])
        .where("user_id", "=", options.user_id)
        .where("is_deleted", "=", false)
        .where(
            "parent_id",
            options.group_id ? "=" : "is",
            options.group_id,
        )
        .orderBy("type")
        .orderBy("id");
};

const getGroupNoteQuery = (options: {
    user_id: number;
    group_id: number | null;
}) => {
    return db.selectFrom("group_note")
        .select([
            sql<string>`'note'`.as("type"),
            sql<number>`note.id`.as("id"),
            sql<string>`note.title`.as("name"),
            sql<number>`0`.as("has_children"),
        ])
        .innerJoin("note", "note.id", "group_note.note_id")
        .where("note.is_deleted", "=", false)
        .where("group_note.user_id", "=", options.user_id)
        .where("note.user_id", "=", options.user_id)
        .where(
            "group_note.group_id",
            options.group_id ? "=" : "is",
            options.group_id,
        );
};

export const getTreeList = async (
    group_id: number | null,
    user_id: number,
    type?: ItemType,
): Promise<TreeRecord[]> => {
    let query;

    switch (type) {
        case "group":
            query = getGroupQuery({
                user_id,
                group_id,
                include_only_group_children: true,
            });
            break;
        case "note":
            query = getGroupNoteQuery({ user_id, group_id });
            break;
        default:
            query = getGroupQuery({ user_id, group_id })
                .union(getGroupNoteQuery({ user_id, group_id }));
    }

    const results = await query.execute();

    return results as TreeRecord[];
};
