import { db } from "$backend/database.ts";
import { sql } from "$lib/kysely-sqlite-dialect/deps.ts";
import { applyFilters } from "$lib/kysely-sqlite-dialect/filters.ts";

export interface SearchNoteFilters {
    from_id?: number;
    query: string;
    group_id?: number;
    tag_ids?: number[];
    type: "general" | "shared" | "reminders" | "recycleBin";
}

export interface NoteSearchRecord {
    id: number;
    title: string;
    note: string;
    group_name: string;
    updated_at: number;
    user_name: string;
}

export const searchNotes = async (
    filters: SearchNoteFilters,
    user_id: number,
): Promise<NoteSearchRecord[]> => {
    let query = db.selectFrom("note")
        .select([
            "note.id",
            "title",
            "note",
            sql<string>`\`group\`.name`.as("group_name"),
            "note.updated_at",
            sql<string>`user.name`.as("user_name"),
        ])
        .leftJoin(
            "group_note",
            (join) =>
                join
                    .onRef("note.id", "=", "group_note.note_id")
                    .on("group_note.user_id", "=", user_id),
        )
        .leftJoin("group", "group_note.group_id", "group.id")
        .innerJoin("user", "user.id", "note.user_id")
        .orderBy("note.id", "asc");

    if (filters.type !== "recycleBin") {
        query = query.where("note.is_deleted", "=", false);
    }

    query = applyFilters(query, [
        {
            type: "custom",
            value: (e) => {
                if (filters.query.length > 0) {
                    return e.or([
                        e("note.title", "like", `%${filters.query}%`),
                        e("note.note", "like", `%${filters.query}%`),
                    ]);
                }

                return null;
            },
        },
        { field: "group.id", type: "value", value: filters.group_id },
        {
            type: "custom",
            value: (e) => {
                if (!filters.tag_ids || filters.tag_ids.length === 0) {
                    return null;
                }

                return e.and([
                    e(
                        "note.id",
                        "in",
                        db.selectFrom("note_tag_note").select("note_id").where(
                            "tag_id",
                            "in",
                            filters.tag_ids,
                        ),
                    ),
                ]);
            },
        },
        {
            type: "custom",
            value: (e) => {
                switch (filters.type) {
                    case "general":
                        return e("note.user_id", "=", user_id);
                    case "shared":
                        return e(
                            "note.id",
                            "in",
                            db.selectFrom("note_share_user").select("note_id")
                                .where(
                                    "user_id",
                                    "=",
                                    user_id,
                                ),
                        );
                    case "reminders":
                        return e(
                            "note.id",
                            "in",
                            db.selectFrom("note_reminder").select("note_id")
                                .where("user_id", "=", user_id),
                        );
                    case "recycleBin":
                        return e.and([
                            e("note.is_deleted", "=", true),
                            e("note.user_id", "=", user_id),
                        ]);
                    default:
                        return e(sql`1`, "=", sql`0`);
                }
            },
        },
        {
            type: "custom",
            value: (e) => {
                if (filters.from_id) {
                    return e("note.id", ">", filters.from_id);
                }

                return null;
            },
        },
    ]);

    return await query.execute();
};
