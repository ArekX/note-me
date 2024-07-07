import { db } from "$backend/database.ts";
import { sql } from "../../lib/kysely-sqlite-dialect/deps.ts";
import { applyFilters } from "$lib/kysely-sqlite-dialect/filters.ts";
import { Paged, pageResults } from "$lib/kysely-sqlite-dialect/pagination.ts";

export type ItemType = "note" | "group";

export interface TreeRecord {
    type: ItemType;
    id: number;
    name: string;
    has_children: number;
}

const getTreeListQuery = (user_id: number, group_id?: number | null) => {
    let groupNoteQuery = db.selectFrom("group_note")
        .select([
            sql<string>`'note'`.as("type"),
            sql<number>`note.id`.as("id"),
            sql<string>`note.title`.as("name"),
            sql<number>`0`.as("has_children"),
        ])
        .innerJoin("note", "note.id", "group_note.note_id")
        .where("note.is_deleted", "=", false)
        .where("group_note.user_id", "=", user_id)
        .where("note.user_id", "=", user_id);

    if (group_id !== undefined) {
        groupNoteQuery = groupNoteQuery.where(
            "group_note.group_id",
            group_id ? "=" : "is",
            group_id,
        );
    }

    let groupQuery = db.selectFrom("group")
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
        .where("user_id", "=", user_id)
        .where("is_deleted", "=", false)
        .orderBy("type")
        .orderBy("id");

    if (group_id !== undefined) {
        groupQuery = groupQuery.where(
            "parent_id",
            group_id ? "=" : "is",
            group_id,
        );
    }

    return groupQuery.union(groupNoteQuery);
};

export const getTreeList = async (
    group_id: number | null,
    user_id: number,
): Promise<TreeRecord[]> => {
    const results = await getTreeListQuery(user_id, group_id).execute();

    return results as TreeRecord[];
};

interface TreeFilter {
    name?: string;
}

export const findTreeItems = async (
    filter: TreeFilter,
    page: number,
    user_id: number,
): Promise<Paged<TreeRecord>> => {
    let query = db.selectFrom(getTreeListQuery(user_id).as("tree"))
        .selectAll();

    query = applyFilters(query, [
        { field: "tree.name", type: "text", value: filter.name },
    ]);

    return await pageResults(query, page);
};
