import { db } from "$backend/database.ts";
import { NoteTagTable, RecordId } from "$types";
import { getCurrentUnixTimestamp } from "$backend/time.ts";
import { applyFilters } from "$lib/kysely-sqlite-dialect/filters.ts";
import { Paged } from "$lib/kysely-sqlite-dialect/pagination.ts";
import { pageResults } from "$lib/kysely-sqlite-dialect/pagination.ts";

export type TagRecord =
    & Pick<
        NoteTagTable,
        "name"
    >
    & RecordId;

export const resolveTags = async (
    user_id: number,
    tags: string[],
): Promise<TagRecord[]> => {
    if (tags.length == 0) {
        return [];
    }

    const uniqueTags = Array.from(
        new Set(tags.map((t) => t.toLowerCase().trim().replace(/ /g, ""))),
    );

    const existingTags = await db.selectFrom("note_tag")
        .select(["id", "name"])
        .where("name", "in", uniqueTags)
        .execute();

    const newRecords = uniqueTags
        .filter((tag) => existingTags.find((r) => r.name === tag) === undefined)
        .map((name) => ({
            name,
            user_id,
            created_at: getCurrentUnixTimestamp(),
        }));

    if (newRecords.length > 0) {
        const results = await db.insertInto("note_tag")
            .values(newRecords)
            .returning("id")
            .execute();

        for (let i = 0; i < results.length; i++) {
            existingTags.push({
                id: Number(results[i].id),
                ...newRecords[i],
            });
        }
    }

    return existingTags;
};

export const linkNoteWithTags = async (
    note_id: number,
    user_id: number,
    tags: string[],
): Promise<boolean> => {
    const tagRecords = await resolveTags(user_id, tags);

    if (tagRecords.length == 0) {
        return true;
    }

    const results = await db.insertInto("note_tag_note")
        .values(tagRecords.map((tag) => ({
            note_id,
            tag_id: tag.id,
            created_at: getCurrentUnixTimestamp(),
        })))
        .returning("id")
        .execute();

    if (results.length !== tagRecords.length) {
        throw new Error("Could not link note with tags!");
    }
    return true;
};

export interface FindTagFilters {
    name: string;
}

export const findTags = async (
    filters: FindTagFilters,
    page: number,
): Promise<Paged<TagRecord>> => {
    let query = db.selectFrom("note_tag")
        .select([
            "id",
            "name",
        ]);

    query = applyFilters(query, {
        name: { type: "text", value: filters.name },
    });

    return await pageResults(query, page);
};

export type CreateTagData = Pick<NoteTagTable, "name">;

export const createTagRecord = async (
    data: CreateTagData,
    user_id: number,
): Promise<TagRecord> => {
    const tagRecord = {
        name: data.name,
        user_id,
        created_at: getCurrentUnixTimestamp(),
    };
    const result = await db.insertInto("note_tag")
        .values(tagRecord)
        .executeTakeFirst();

    return {
        id: Number(result.insertId!),
        ...tagRecord,
    };
};

export type UpdateTagData = Pick<NoteTagTable, "name">;

export const updateTagRecord = async (
    id: number,
    data: UpdateTagData,
): Promise<boolean> => {
    const result = await db.updateTable("note_tag")
        .set({
            name: data.name,
        })
        .where("id", "=", id)
        .executeTakeFirst();

    return result.numUpdatedRows > 0;
};

export const deleteTagRecord = async (
    id: number,
): Promise<boolean> => {
    await db.deleteFrom("note_tag_note")
        .where("tag_id", "=", id)
        .execute();

    const result = await db.deleteFrom("note_tag")
        .where("id", "=", id)
        .executeTakeFirst();

    return result.numDeletedRows > 0;
};
