import { db } from "$backend/database.ts";
import { sql } from "$lib/kysely-sqlite-dialect/deps.ts";
import { applyFilters } from "$lib/kysely-sqlite-dialect/filters.ts";
import { Paged, pageResults } from "$lib/kysely-sqlite-dialect/pagination.ts";

export type ItemType = "note" | "group";

export interface TreeRecord {
    type: ItemType;
    id: number;
    name: string;
    text: string;
    has_children: number;
}

interface TreeListQueryOptions {
    user_id: number;
    group_id?: number | null;
    scope_by_group_id?: boolean;
    include_has_children_data?: boolean;
    include_text_data?: boolean;
}

const getTreeListQuery = ({
    user_id,
    group_id = null,
    scope_by_group_id = false,
    include_has_children_data = false,
    include_text_data = false,
}: TreeListQueryOptions) => {
    let groupNoteQuery = db.selectFrom("group_note")
        .select([
            sql<string>`'note'`.as("type"),
            sql<number>`note.id`.as("id"),
            sql<string>`note.title`.as("name"),
            sql<number>`0`.as("has_children"),
            include_text_data
                ? sql<string>`note.note`.as("text")
                : sql<string>`''`.as("text"),
        ])
        .innerJoin("note", "note.id", "group_note.note_id")
        .where("note.is_deleted", "=", false)
        .where("group_note.user_id", "=", user_id)
        .where("note.user_id", "=", user_id);

    if (scope_by_group_id) {
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
            include_has_children_data
                ? sql<number>`COALESCE((
                SELECT 1 FROM "group" "gc" WHERE "gc"."parent_id" = "group"."id"
                UNION
                SELECT 1 FROM "group_note" "gn" WHERE "gn"."group_id" = "group"."id" AND "gn"."note_id" NOT IN (
                    SELECT id FROM note WHERE is_deleted = true
                ) LIMIT 1
            ), 0)`.as("has_children")
                : sql<number>`0`.as("has_children"),
            sql<string>`''`.as("text"),
        ])
        .where("user_id", "=", user_id)
        .where("is_deleted", "=", false)
        .orderBy("type")
        .orderBy("id");

    if (scope_by_group_id) {
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
    const results = await getTreeListQuery({
        user_id,
        group_id,
        scope_by_group_id: true,
        include_has_children_data: true,
    }).execute();

    return results as TreeRecord[];
};

export interface FindTreeItemsFilter {
    search?: string;
    type?: ItemType;
}

export const findTreeItems = async (
    filter: FindTreeItemsFilter,
    page: number,
    user_id: number,
): Promise<Paged<TreeRecord>> => {
    let query = db.selectFrom(
        getTreeListQuery({
            user_id,
            include_text_data: true,
        }).as("tree"),
    )
        .selectAll();

    query = applyFilters(query, [
        {
            type: "custom",
            value: (e) =>
                filter.search
                    ? e.or([
                        e("tree.name", "like", `%${filter.search}%`),
                        e("tree.text", "like", `%${filter.search}%`),
                    ])
                    : null,
        },
        { field: "tree.type", type: "value", value: filter.type },
    ]);

    return await pageResults(query, page);
};
