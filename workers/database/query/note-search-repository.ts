import { db } from "$backend/database.ts";
import { sql } from "$lib/kysely-sqlite-dialect/deps.ts";
import { applyFilters } from "$lib/kysely-sqlite-dialect/filters.ts";
import { DeletedNoteRecord } from "./note-repository.ts";
import { ReminderNoteRecord } from "./note-reminder-repository.ts";
import { UserSharedNoteMeta } from "./note-share-repository.ts";

export type SearchType = "general" | "shared" | "reminders" | "recycleBin";

export type NoteSearchResult =
    | NoteSearchRecord
    | ReminderNoteRecord
    | UserSharedNoteMeta
    | DeletedNoteRecord;

export interface SearchNoteFilters {
    from_id?: number;
    query: string;
    group_id?: number;
    tags?: string[];
    type: SearchType;
}

export interface NoteSearchRecord {
    id: number;
    title: string;
    note: string;
    group_name: string;
    is_encrypted: boolean;
    updated_at: number;
    user_name: string;
}

const findChildrenGroupIds = async (user_id: number, group_id: number) => {
    const groups = await db.selectFrom("group")
        .select([
            "id",
            "parent_id",
        ])
        .where("user_id", "=", user_id)
        .execute();

    const groupIds = [group_id];

    const findGroupIds = (parentId: number) => {
        for (const group of groups) {
            if (group.parent_id === parentId) {
                groupIds.push(group.id);
                findGroupIds(group.id);
            }
        }
    };

    findGroupIds(group_id);

    return groupIds;
};

export const searchGeneral = async (
    filters: SearchNoteFilters,
    user_id: number,
): Promise<NoteSearchRecord[]> => {
    return await db.selectFrom("note")
        .select([
            "note.id",
            "title",
            "note",
            "is_encrypted",
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
        .where(
            "note.id",
            "in",
            getSearchNoteIdQuery(
                await getInternalFilters(filters, user_id),
                user_id,
            ),
        )
        .orderBy("note.id", "asc")
        .execute();
};

export const searchDeletedNotes = async (
    filters: SearchNoteFilters,
    user_id: number,
): Promise<DeletedNoteRecord[]> => {
    return await db.selectFrom("note")
        .select([
            "note.id",
            "note.title",
            "note.is_encrypted",
            "note.deleted_at",
        ])
        .where(
            "note.id",
            "in",
            getSearchNoteIdQuery(
                await getInternalFilters(filters, user_id),
                user_id,
            ),
        )
        .orderBy("note.id", "asc")
        .execute();
};

export const searchReminderNotes = async (
    filters: SearchNoteFilters,
    user_id: number,
): Promise<ReminderNoteRecord[]> => {
    return await db.selectFrom("note_reminder")
        .innerJoin("note", "note.id", "note_reminder.note_id")
        .innerJoin("user", "user.id", "note.user_id")
        .select([
            "note_reminder.id",
            "note_reminder.note_id",
            "note.title",
            "note.is_encrypted",
            sql<number>`note.user_id`.as("author_id"),
            sql<string>`user.name`.as("author_name"),
            sql<
                "once" | "repeat"
            >`(CASE WHEN note_reminder.interval IS NULL THEN 'once' ELSE 'repeat' END)`
                .as("type"),
            "note_reminder.done_count",
            "note_reminder.interval",
            "note_reminder.unit_value",
            "note_reminder.repeat_count",
            "note_reminder.next_at",
        ])
        .where(
            "note.id",
            "in",
            getSearchNoteIdQuery(
                await getInternalFilters(filters, user_id),
                user_id,
            ),
        )
        .orderBy("note.id", "asc")
        .execute();
};

export const searchSharedNotes = async (
    filters: SearchNoteFilters,
    user_id: number,
): Promise<UserSharedNoteMeta[]> => {
    return await db.selectFrom("note_share_user")
        .innerJoin("note", "note.id", "note_share_user.note_id")
        .innerJoin("user", "user.id", "note.user_id")
        .select([
            "note.id",
            sql<number>`note_share_user.id`.as("share_id"),
            "note.title",
            "note.is_encrypted",
            sql<string>`user.name`.as("user_name"),
            "note_share_user.created_at",
        ])
        .where(
            "note.id",
            "in",
            getSearchNoteIdQuery(
                await getInternalFilters(filters, user_id),
                user_id,
            ),
        )
        .execute();
};

const getInternalFilters = async (
    filters: SearchNoteFilters,
    user_id: number,
): Promise<InternalFlters> => {
    const resolved_group_ids = filters.group_id
        ? await findChildrenGroupIds(user_id, filters.group_id)
        : [];

    return {
        ...filters,
        resolved_group_ids,
    };
};

interface InternalFlters extends SearchNoteFilters {
    resolved_group_ids: number[];
}

const getSearchNoteIdQuery = (
    filters: InternalFlters,
    user_id: number,
) => {
    let query = db.selectFrom("note")
        .select([
            "note.id",
        ])
        .leftJoin(
            "group_note",
            (join) =>
                join
                    .onRef("note.id", "=", "group_note.note_id")
                    .on("group_note.user_id", "=", user_id),
        )
        .orderBy("note.id", "asc")
        .limit(10);

    if (filters.type !== "recycleBin") {
        query = query.where("note.is_deleted", "=", false);
    }

    const childGroupIds = filters.group_id ? filters.resolved_group_ids : [];

    query = applyFilters(query, [
        {
            type: "custom",
            value: (e) => {
                if (filters.query.length > 0) {
                    return e.or([
                        e("note.title", "like", `%${filters.query}%`),
                        e.and([
                            e("note.note", "like", `%${filters.query}%`),
                            e("note.is_encrypted", "=", false),
                        ]),
                    ]);
                }

                return null;
            },
        },
        {
            type: "custom",
            value: (e) => {
                if (!filters.group_id) {
                    return null;
                }
                return e("group_note.group_id", "in", childGroupIds);
            },
        },
        {
            type: "custom",
            value: (e) => {
                if (!filters.tags || filters.tags.length === 0) {
                    return null;
                }

                return e.and([
                    e(
                        "note.id",
                        "in",
                        db.selectFrom("note_tag_note").select(
                            "note_tag_note.note_id",
                        )
                            .innerJoin(
                                "note_tag",
                                "note_tag_note.tag_id",
                                "note_tag.id",
                            )
                            .where(
                                "note_tag.name",
                                "in",
                                filters.tags,
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

    return query;
};
